import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

// El límite global es por IP (con trust proxy = 1: la IP real detrás del
// proxy de Railway). En una granja, el ESP32, el computador y el móvil suelen
// salir por la misma IP pública: con un solo cupo, una pantalla de monitoreo
// abierta gasta el del ESP32, y un 429 en /ingest le hace perder el ciclo
// (mediciones y confirmaciones de órdenes).
//
// La ingesta cuenta en su propio cupo, también por IP y con el mismo límite:
// sigue protegida, y no basta con inventar tokens para saltárselo. El resto
// de rutas se comporta exactamente como antes.
@Injectable()
export class ThrottlerPorCanalGuard extends ThrottlerGuard {
  protected override async getTracker(
    req: Record<string, unknown>,
  ): Promise<string> {
    const ip = await super.getTracker(req);
    return esRutaIngesta(req) ? `ingest:${ip}` : ip;
  }
}

export function esRutaIngesta(req: {
  originalUrl?: unknown;
  url?: unknown;
}): boolean {
  const url =
    typeof req.originalUrl === 'string'
      ? req.originalUrl
      : typeof req.url === 'string'
        ? req.url
        : '';
  const ruta = url.split('?')[0];
  return ruta === '/ingest' || ruta.startsWith('/ingest/');
}
