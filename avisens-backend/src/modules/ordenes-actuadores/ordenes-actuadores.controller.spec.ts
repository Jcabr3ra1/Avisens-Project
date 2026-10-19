import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/auth/roles';
import { OrdenesActuadoresController } from './ordenes-actuadores.controller';

// Accionar un relé exige sesión y rol: si alguien quita el guard de la clase,
// cualquiera con la URL podría encender la calefacción.
describe('OrdenesActuadoresController (autorización)', () => {
  it('protege todas las rutas con JWT y roles', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      OrdenesActuadoresController,
    ) as unknown[];
    expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
  });

  it('solo admite los tres roles del sistema; el alcance lo aplica el servicio', () => {
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      OrdenesActuadoresController,
    ) as string[];
    expect(roles).toEqual([
      ROLES.ADMINISTRADOR,
      ROLES.PROPIETARIO,
      ROLES.OPERARIO,
    ]);
  });
});
