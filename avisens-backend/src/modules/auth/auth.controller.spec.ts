import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/auth/roles';
import { AuthController } from './auth.controller';

describe('AuthController · cambiar contraseña', () => {
  it('no lo permite al Propietario (QA 17-nov)', () => {
    const metodo = Object.getOwnPropertyDescriptor(
      AuthController.prototype,
      'cambiarPassword',
    )?.value as object;
    const roles = Reflect.getMetadata(ROLES_KEY, metodo) as string[];

    expect(roles).toEqual([ROLES.ADMINISTRADOR, ROLES.OPERARIO]);
    expect(roles).not.toContain(ROLES.PROPIETARIO);
  });
});
