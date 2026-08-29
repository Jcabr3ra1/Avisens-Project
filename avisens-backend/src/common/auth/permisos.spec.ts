import { PERMISOS, rolTienePermisos } from './permisos';
import { ROLES } from './roles';

describe('matriz RBAC', () => {
  it('reserva organizaciones y catálogos mutables al Administrador', () => {
    expect(
      rolTienePermisos(ROLES.ADMINISTRADOR, [
        PERMISOS.ORGANIZACIONES_GESTIONAR,
        PERMISOS.CATALOGOS_GESTIONAR,
      ]),
    ).toBe(true);
    expect(
      rolTienePermisos(ROLES.PROPIETARIO, [PERMISOS.ORGANIZACIONES_GESTIONAR]),
    ).toBe(false);
  });

  it('permite lectura de catálogos al Operario sin darle gestión', () => {
    expect(rolTienePermisos(ROLES.OPERARIO, [PERMISOS.CATALOGOS_LEER])).toBe(
      true,
    );
    expect(
      rolTienePermisos(ROLES.OPERARIO, [PERMISOS.CATALOGOS_GESTIONAR]),
    ).toBe(false);
    expect(rolTienePermisos(ROLES.OPERARIO, [PERMISOS.PROVEEDORES_LEER])).toBe(
      true,
    );
  });

  it('niega roles desconocidos', () => {
    expect(rolTienePermisos('Desconocido', [PERMISOS.CATALOGOS_LEER])).toBe(
      false,
    );
  });
});
