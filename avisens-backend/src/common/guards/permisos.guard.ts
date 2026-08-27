import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { rolTienePermisos, type Permiso } from '../auth/permisos';
import { PERMISOS_KEY } from '../decorators/permisos.decorator';

@Injectable()
export class PermisosGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(contexto: ExecutionContext): boolean {
    const requeridos = this.reflector.getAllAndOverride<Permiso[]>(
      PERMISOS_KEY,
      [contexto.getHandler(), contexto.getClass()],
    );
    if (!requeridos?.length) return true;

    const peticion = contexto.switchToHttp().getRequest<{
      user?: { rol?: string };
    }>();
    return rolTienePermisos(peticion.user?.rol ?? '', requeridos);
  }
}
