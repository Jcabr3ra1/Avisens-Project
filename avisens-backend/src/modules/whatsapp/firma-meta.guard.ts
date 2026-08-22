import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';

const CABECERA = 'x-hub-signature-256';
const PREFIJO = 'sha256=';

@Injectable()
export class FirmaMetaGuard implements CanActivate {
  private readonly logger = new Logger(FirmaMetaGuard.name);

  canActivate(contexto: ExecutionContext): boolean {
    const secreto = process.env.WHATSAPP_APP_SECRET;

    if (!secreto) {
      if (process.env.NODE_ENV === 'production') {
        this.logger.error(
          'WHATSAPP_APP_SECRET sin definir: se rechaza el webhook',
        );
        throw new ForbiddenException();
      }
      this.logger.warn(
        'WHATSAPP_APP_SECRET sin definir: no se valida la firma (solo fuera de produccion)',
      );
      return true;
    }

    const peticion = contexto
      .switchToHttp()
      .getRequest<RawBodyRequest<Request>>();

    const recibida = peticion.headers[CABECERA];
    const cuerpo = peticion.rawBody;

    if (typeof recibida !== 'string' || !recibida.startsWith(PREFIJO)) {
      this.logger.warn('Webhook sin cabecera X-Hub-Signature-256');
      throw new ForbiddenException();
    }

    if (!cuerpo) {
      this.logger.error('No hay cuerpo crudo: revisa rawBody en main.ts');
      throw new ForbiddenException();
    }

    const esperada = createHmac('sha256', secreto).update(cuerpo).digest();
    const enviada = Buffer.from(recibida.slice(PREFIJO.length), 'hex');

    if (
      enviada.length !== esperada.length ||
      !timingSafeEqual(enviada, esperada)
    ) {
      this.logger.warn('Firma de Meta invalida: se rechaza el webhook');
      throw new ForbiddenException();
    }

    return true;
  }
}
