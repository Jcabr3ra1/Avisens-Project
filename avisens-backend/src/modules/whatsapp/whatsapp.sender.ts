import { Injectable, Logger } from '@nestjs/common';

const PROVEDOR = process.env.WHATSAPP_PROVIDER ?? 'simulado';
const VERSION = process.env.WHATSAPP_API_VERSION ?? 'v25.0';
const TIMEOUT_MS = 8000;

@Injectable()
export class WhatsappSender {
  private readonly logger = new Logger(WhatsappSender.name);

  async enviarTexto(destino: string, texto: string): Promise<boolean> {
    if (PROVEDOR !== 'meta') {
      this.logger.log(`[SIMULADO] -> ${destino}: ${texto}`);
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

    try {
      const respuesta = await fetch(
        `https://graph.facebook.com/${VERSION}/${phoneId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: destino,
            type: 'text',
            text: { preview_url: false, body: texto },
          }),
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
}
