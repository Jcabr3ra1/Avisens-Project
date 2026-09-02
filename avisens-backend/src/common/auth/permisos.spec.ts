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

  // Abrir /usuarios-galpones al operario se hizo con un permiso de LECTURA
  // aparte. Si algun dia alguien le concede el de gestion, el operario
  // podria repartir asignaciones, que es trabajo del propietario.
  it('el operario lee usuarios pero no los gestiona', () => {
    expect(rolTienePermisos(ROLES.OPERARIO, [PERMISOS.USUARIOS_LEER])).toBe(
      true,
    );
    expect(
      rolTienePermisos(ROLES.OPERARIO, [PERMISOS.USUARIOS_GESTIONAR]),
    ).toBe(false);
  });

  it('el propietario conserva las dos', () => {
    expect(
      rolTienePermisos(ROLES.PROPIETARIO, [
        PERMISOS.USUARIOS_LEER,
        PERMISOS.USUARIOS_GESTIONAR,
      ]),
    ).toBe(true);
  });
});
