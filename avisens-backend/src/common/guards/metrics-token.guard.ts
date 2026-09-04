import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import type { Request } from 'express';

const CABECERA = 'authorization';
const PREFIJO = 'Bearer ';

@Injectable()
export class MetricsTokenGuard implements CanActivate {
  private readonly logger = new Logger(MetricsTokenGuard.name);

  canActivate(contexto: ExecutionContext): boolean {
    const esperado = process.env.METRICS_TOKEN;

    if (!esperado) {
      if (process.env.NODE_ENV === 'production') {
        this.logger.error('METRICS_TOKEN sin definir: se rechaza /metrics');
        throw new ForbiddenException();
      }
      this.logger.warn(
        'METRICS_TOKEN sin definir: /metrics queda abierto (solo fuera de produccion)',
      );
      return true;
    }

    const peticion = contexto.switchToHttp().getRequest<Request>();
    const recibida = peticion.headers[CABECERA];

    if (typeof recibida !== 'string' || !recibida.startsWith(PREFIJO)) {
      throw new ForbiddenException();
    }

    if (!this.coincide(recibida.slice(PREFIJO.length), esperado)) {
      this.logger.warn('Token invalido en /metrics');
      throw new ForbiddenException();
    }

    return true;
  }

  // Comparar con === se corta en el primer byte distinto, y ese tiempo
  // filtra cuantos caracteres se acertaron. El scraper solo tiene que
  // acertar entero, asi que no le cuesta nada; a quien adivina, si.
  private coincide(recibido: string, esperado: string): boolean {
    const a = Buffer.from(recibido);
    const b = Buffer.from(esperado);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
