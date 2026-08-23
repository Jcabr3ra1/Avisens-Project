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

const FIN = 'FIN';
const HORAS_INACTIVIDAD = Number(process.env.WHATSAPP_HORAS_INACTIVIDAD ?? 24);
const DESPEDIDA =
  'No recibimos tu respuesta, así que cerramos esta conversación por ahora.\n\n' +
  'Cuando quieras retomarla escríbenos de nuevo y con gusto te atendemos. ' +
  'Gracias por tu interés en AVISENS.';

const CIERRE_BASE =
  'Gracias por tu tiempo. Con la información de tu granja estamos generando ' +
  'una cotización personalizada de AVISENS que recibirás en breve por ' +
  'WhatsApp o correo.';

// Textos definidos por la especificacion del 16/08/2026, uno por resultado.
const CIERRE_POR_RESULTADO: Record<string, string> = {
  caliente:
    '¡Tu granja es un candidato ideal para AVISENS! Un asesor comercial te ' +
    'contactará en las próximas 24 horas para coordinar una visita técnica y ' +
    'afinar tu propuesta.',
  tibio:
    'AVISENS puede aportar mucho a tu operación. Te invitaremos a una ' +
    'demostración remota para que veas la plataforma en acción y resolvamos ' +
    'tus dudas antes de avanzar.',
  frio:
    'Gracias por conocer AVISENS. Te enviaremos información útil sobre ' +
    'monitoreo y bienestar avícola y quedaremos atentos para cuando decidas ' +
    'dar el siguiente paso.',
  CALLBACK_DECISOR:
    'Gracias por tu interés. Como la decisión de compra recae en otra ' +
    'persona, un asesor te escribirá dentro de 48 horas para retomar el ' +
    'proceso con el responsable.',
  sin_consentimiento:
    'Entendido. Sin tu autorización para el tratamiento de datos no podemos ' +
    'continuar con la cotización. Si cambias de opinión, escríbenos cuando lo ' +
    'desees.',
};

const CIERRE_PQRS =
  '¡Listo! Tu solicitud quedó radicada.\n\n' +
  'Le haremos seguimiento y te responderemos por este mismo medio. ' +
  'Gracias por escribirnos.';

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
    if (!pregunta) return 'Conversación finalizada.';
    if (!pregunta.opciones?.length) return pregunta.texto;

    const opciones = pregunta.opciones
      .map((o, i) => `${i + 1}. ${o}`)
      .join('\n');
    return `${pregunta.texto}\n\n${opciones}`;
  }

  async cerrarInactivas() {
    const limite = new Date(Date.now() - HORAS_INACTIVIDAD * 3600_000);

    const abandonadas = await this.prisma.prospecto.findMany({
      where: {
        canal_origen: 'whatsapp',
        pregunta_actual: { not: FIN },
        ultima_actividad: { lt: limite },
      },
      select: { id: true, telefono: true },
    });

    for (const prospecto of abandonadas) {
      await this.prisma.prospecto.update({
        where: { id: prospecto.id },
        data: {
          pregunta_actual: FIN,
          estado: 'abandonado',
          fecha_finalizacion: new Date(),
        },
      });

      if (prospecto.telefono) {
        await this.encolarSalida(prospecto.telefono, DESPEDIDA);
      }
    }

    if (abandonadas.length) {
      this.logger.log(
        `Cerradas ${abandonadas.length} conversaciones sin respuesta en ${HORAS_INACTIVIDAD}h`,
      );
    }

    return abandonadas.length;
  }

  private cierre(r: {
    clasificacion: string | null;
    accion_siguiente?: string | null;
  }) {
    if (r.clasificacion === 'pqrs') return CIERRE_PQRS;

    // El callback por falta de decisor manda sobre la clasificacion por puntaje.
    const clave =
      r.accion_siguiente === 'CALLBACK_DECISOR'
        ? 'CALLBACK_DECISOR'
        : (r.clasificacion ?? '');

    const especifico = CIERRE_POR_RESULTADO[clave];
    if (!especifico) return CIERRE_BASE;
    if (clave === 'sin_consentimiento') return especifico;

    return `${CIERRE_BASE}\n\n${especifico}`;
  }

  private async reintento(sesionId: string) {
    try {
      const pregunta = await this.chatbot.preguntaActual(sesionId);
      if (pregunta) {
        return `No te entendí. Elige una de estas opciones:\n\n${this.formatear(pregunta)}`;
      }
    } catch {
      this.logger.warn(`No se pudo releer la pregunta de ${sesionId}`);
    }
    return 'No te entendí. ¿Puedes intentarlo de nuevo, por favor?';
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
        pregunta_actual: { not: FIN },
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
        ? this.cierre(r)
        : this.formatear(r.pregunta);

      await this.encolarSalida(entrante.de, texto);
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : 'Hubo un problema';
      this.logger.warn(`Chatbot rechazo la respuesta: ${mensaje}`);
      await this.encolarSalida(entrante.de, await this.reintento(abierto.sesion_id));
    }
  }
}
