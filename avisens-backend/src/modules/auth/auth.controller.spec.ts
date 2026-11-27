import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/auth/roles';
import { AuthController } from './auth.controller';

describe('AuthController · cambiar contraseña', () => {
  it('solo lo permite al Administrador (Propietario y Operario no se cambian su clave solos)', () => {
    const metodo = Object.getOwnPropertyDescriptor(
      AuthController.prototype,
      'cambiarPassword',
    )?.value as object;
    const roles = Reflect.getMetadata(ROLES_KEY, metodo) as string[];

    expect(roles).toEqual([ROLES.ADMINISTRADOR]);
    expect(roles).not.toContain(ROLES.PROPIETARIO);
    expect(roles).not.toContain(ROLES.OPERARIO);
  });
});
