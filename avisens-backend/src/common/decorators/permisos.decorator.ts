import { SetMetadata } from '@nestjs/common';
import type { Permiso } from '../auth/permisos';

export const PERMISOS_KEY = 'permisos';
export const Permisos = (...permisos: Permiso[]) =>
  SetMetadata(PERMISOS_KEY, permisos);
