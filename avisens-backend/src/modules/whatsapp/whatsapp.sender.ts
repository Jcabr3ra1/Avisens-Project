import { Injectable, Logger } from '@nestjs/common';
import { OpcionInteractiva, TrabajoMensaje } from './whatsapp.tipos';

const PROVEDOR = process.env.WHATSAPP_PROVIDER ?? 'simulado';
const VERSION = process.env.WHATSAPP_API_VERSION ?? 'v25.0';
const TIMEOUT_MS = 8000;

const BSUID = /^[A-Z]{2}\.\d+$/;

@Injectable()
export class WhatsappSender {
  private readonly logger = new Logger(WhatsappSender.name);

  private destinatario(destino: string) {
    return BSUID.test(destino)
      ? { recipient_type: 'individual', recipient: destino }
      : { to: destino };
  }

  async enviarTexto(destino: string, texto: string): Promise<boolean> {
    return this.enviar({ destino, texto });
  }

  async enviar(trabajo: TrabajoMensaje): Promise<boolean> {
    if (PROVEDOR === 'simulado') {
      const tipo = trabajo.botones
        ? `botones[${trabajo.botones.length}]`
        : trabajo.lista
          ? `lista[${trabajo.lista.filas.length}]`
          : 'texto';
      this.logger.log(`[SIMULADO] -> ${trabajo.destino} (${tipo}): ${trabajo.texto}`);
      return true;
    }

    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    if (!phoneId || !token) {
      this.logger.error(
        'Falta WHATSAPP_PHONE_NUMBER_ID o WHATSAPP_ACCESS_TOKEN',
      );
      return false;
    }

    await this.enviarTyping(phoneId, token, trabajo.destino);

    const payload = this.construirPayload(trabajo);

    try {
      const respuesta = await fetch(
        `https://graph.facebook.com/${VERSION}/${phoneId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        },
      );

      if (!respuesta.ok) {
        const detalle = await respuesta.text();
        this.logger.error(`Meta respondio ${respuesta.status}: ${detalle}`);
        return false;
      }

      return true;
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : 'error desconocido';
      this.logger.error(`No se pudo enviar a WhatsApp: ${mensaje}`);
      return false;
    }
  }

  private async enviarTyping(phoneId: string, token: string, destino: string) {
    try {
      await fetch(
        `https://graph.facebook.com/${VERSION}/${phoneId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            ...this.destinatario(destino),
            type: 'reaction',
            reaction: { emoji: '', message_id: '' },
          }),
          signal: AbortSignal.timeout(3000),
        },
      );
    } catch {
      // Silenciar errores de typing indicator - es opcional y no debe bloquear el envío
    }
  }

  private construirPayload(trabajo: TrabajoMensaje): Record<string, unknown> {
    const base = {
      messaging_product: 'whatsapp',
      ...this.destinatario(trabajo.destino),
    };

    if (trabajo.botones?.length) {
      return {
        ...base,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: trabajo.texto },
          action: {
            buttons: trabajo.botones.map((b: OpcionInteractiva) => ({
              type: 'reply',
              reply: { id: b.id, title: b.titulo },
            })),
          },
        },
      };
    }

    if (trabajo.lista?.filas.length) {
      return {
        ...base,
        type: 'interactive',
        interactive: {
          type: 'list',
          body: { text: trabajo.texto },
          action: {
            button: trabajo.lista.boton,
            sections: [
              {
                title: 'Opciones',
                rows: trabajo.lista.filas.map((f: OpcionInteractiva) => ({
                  id: f.id,
                  title: f.titulo,
                })),
              },
            ],
          },
        },
      };
    }

    return {
      ...base,
      type: 'text',
      text: { preview_url: false, body: trabajo.texto },
    };
  }
}
