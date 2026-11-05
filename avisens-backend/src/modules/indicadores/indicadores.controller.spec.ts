import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/auth/roles';
import { IndicadoresController } from './indicadores.controller';

describe('IndicadoresController · resumen de crecimiento', () => {
  it('reserva la comparación entre lotes a administrador y propietario', () => {
    const metodo = Object.getOwnPropertyDescriptor(
      IndicadoresController.prototype,
      'resumenCrecimiento',
    )?.value as object;
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      metodo,
    ) as string[];

    expect(roles).toEqual([ROLES.ADMINISTRADOR, ROLES.PROPIETARIO]);
    expect(roles).not.toContain(ROLES.OPERARIO);
  });
});
