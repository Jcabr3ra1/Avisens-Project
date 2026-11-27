import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditoriaService } from './auditoria.service';

const ACCION_POR_METODO: Record<string, string> = {
  POST: 'crear',
  PATCH: 'actualizar',
  PUT: 'actualizar',
  DELETE: 'eliminar',
};

const CAMPOS_SENSIBLES = [
  'password',
  'nueva_password',
  'password_temporal',
  'refresh_token',
  'access_token',
  'cambio_password_token',
  'token',
];

function limpiarCuerpo(body: unknown): Record<string, unknown> | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const copia = { ...(body as Record<string, unknown>) };
  for (const campo of CAMPOS_SENSIBLES) {
    if (campo in copia) copia[campo] = '***';
  }
  return copia;
}

interface PeticionAuditable extends Request {
  user?: { id: number };
}

@Injectable()
export class AuditoriaInterceptor implements NestInterceptor {
  constructor(private auditoria: AuditoriaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<PeticionAuditable>();
    const accionBase = ACCION_POR_METODO[req.method];

    const segmentos = req.path.split('/').filter((s) => s && s !== 'v1');
    const entidad = segmentos[0] ?? '';

    if (!accionBase || entidad === 'ingest') {
      return next.handle();
    }

    return next.handle().pipe(
      tap((respuesta: unknown) => {
        if (entidad === 'auth' && req.path.includes('/refresh')) return;

        let accion = accionBase;
        let datosDespues = limpiarCuerpo(req.body);

        if (entidad === 'auth') {
          accion = req.path.includes('/logout') ? 'logout' : 'login';
          datosDespues = undefined;
        }

        const usuarioResp = (respuesta as { usuario?: { id?: number } } | null)
          ?.usuario?.id;
        const idParam = req.params?.id ? Number(req.params.id) : NaN;

        void this.auditoria.registrar({
          usuario_id: req.user?.id ?? usuarioResp ?? null,
          accion,
          entidad_afectada: entidad,
          registro_id: Number.isInteger(idParam) ? idParam : null,
          datos_despues: datosDespues,
          ip_origen: req.ip,
          user_agent: req.headers['user-agent'],
        });
      }),
    );
  }
}
