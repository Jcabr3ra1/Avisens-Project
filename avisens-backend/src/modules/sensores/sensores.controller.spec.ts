import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/auth/roles';
import { SensoresController } from './sensores.controller';

// El permiso se exige en el backend, no solo en la interfaz: registrar o
// editar relés cambia a dónde llegan las órdenes remotas.
describe('SensoresController (autorización)', () => {
  const rolesDe = (metodo: keyof SensoresController) =>
    Reflect.getMetadata(
      ROLES_KEY,
      SensoresController.prototype[metodo],
    ) as string[] | undefined;

  it('protege todas las rutas con JWT y roles', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, SensoresController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
  });

  it('registrar relés y editar sensores es solo del administrador', () => {
    expect(rolesDe('registrarReles')).toEqual([ROLES.ADMINISTRADOR]);
    expect(rolesDe('actualizar')).toEqual([ROLES.ADMINISTRADOR]);
    expect(rolesDe('crear')).toEqual([ROLES.ADMINISTRADOR]);
  });

  it('consultar la ficha queda abierto a los tres roles (el alcance lo aplica el servicio)', () => {
    expect(rolesDe('obtener')).toBeUndefined();
    expect(Reflect.getMetadata(ROLES_KEY, SensoresController)).toEqual([
      ROLES.ADMINISTRADOR,
      ROLES.PROPIETARIO,
      ROLES.OPERARIO,
    ]);
  });
});
