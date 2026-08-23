import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { ChatbotService } from '../chatbot/chatbot.service';
import {
  COLA_WHATSAPP,
  MensajeEntrante,
  TrabajoMensaje,
} from './whatsapp.tipos';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    @InjectQueue(COLA_WHATSAPP) private cola: Queue<TrabajoMensaje>,
    private prisma: PrismaService,
    private chatbot: ChatbotService,
  ) {}

  async encolarEntrantes(cuerpo: unknown) {
    for (const mensaje of this.extraer(cuerpo)) {
      this.logger.log(`Entrante ${mensaje.wamid} de ${mensaje.de}`);
      await this.cola.add('entrante', mensaje as unknown as TrabajoMensaje, {
        jobId: mensaje.wamid,
      });
    }
  }

  private extraer(cuerpo: unknown): MensajeEntrante[] {
    const entradas =
      (cuerpo as { entry?: Array<{ changes?: Array<{ value?: unknown }> }> })
        ?.entry ?? [];

    const mensajes: MensajeEntrante[] = [];
    for (const entrada of entradas) {
      for (const cambio of entrada.changes ?? []) {
        const valor = cambio.value as {
          contacts?: Array<{ wa_id?: string; user_id?: string }>;
          messages?: Array<{
            id: string;
            from?: string;
            from_user_id?: string;
            type: string;
            text?: { body: string };
          }>;
        };
        const contacto = valor?.contacts?.[0];
        const respaldo = contacto?.wa_id ?? contacto?.user_id;
        for (const m of valor?.messages ?? []) {
          if (m.type !== 'text' || !m.text?.body) continue;

          const de = m.from ?? m.from_user_id ?? respaldo;
          if (!de) {
            this.logger.warn(
              `Mensaje ${m.id} sin remitente: se descarta para no engancharlo a otra conversacion`,
            );
            continue;
          }

          mensajes.push({ de, texto: m.text.body, wamid: m.id });
        }
      }
    }
    return mensajes;
  }

  private formatear(
    pregunta: { texto: string; opciones: string[] | null } | null,
  ): string {
    if (!pregunta) return 'Conversacion finalizada.';
    if (!pregunta.opciones?.length) return pregunta.texto;

    const opciones = pregunta.opciones
      .map((o, i) => `${i + 1}. ${o}`)
      .join('\n');
    return `${pregunta.texto}\n\n${opciones}`;
  }

  private async reintento(sesionId: string) {
    try {
      const pregunta = await this.chatbot.preguntaActual(sesionId);
      if (pregunta) {
        return `No te entendi.\n\n${this.formatear(pregunta)}`;
      }
    } catch {
      this.logger.warn(`No se pudo releer la pregunta de ${sesionId}`);
    }
    return 'No te entendi. Intenta de nuevo, por favor.';
  }

  private async encolarSalida(destino: string, texto: string) {
    await this.cola.add('saliente', { destino, texto });
  }

  async responder(entrante: MensajeEntrante) {
    if (!entrante.de) {
      this.logger.warn(`Mensaje ${entrante.wamid} sin remitente: se ignora`);
      return;
    }

    const abierto = await this.prisma.prospecto.findFirst({
      where: {
        telefono: entrante.de,
        canal_origen: 'whatsapp',
        pregunta_actual: { not: 'FIN' },
      },
      orderBy: { fecha_inicio: 'desc' },
      select: { sesion_id: true },
    });

    if (!abierto) {
      const inicio = await this.chatbot.iniciar({ canal_origen: 'whatsapp' });
      await this.prisma.prospecto.update({
        where: { sesion_id: inicio.sesion_id },
        data: { telefono: entrante.de },
      });
      await this.encolarSalida(entrante.de, this.formatear(inicio.pregunta));
      return;
    }

    try {
      const r = await this.chatbot.responder({
        sesion_id: abierto.sesion_id,
        respuesta: entrante.texto,
      });

      const texto = r.finalizado
        ? `Listo, gracias. Un asesor de Avisens se comunicara contigo pronto.`
        : this.formatear(r.pregunta);

      await this.encolarSalida(entrante.de, texto);
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : 'Hubo un problema';
      this.logger.warn(`Chatbot rechazo la respuesta: ${mensaje}`);
      await this.encolarSalida(entrante.de, await this.reintento(abierto.sesion_id));
    }
  }
}
