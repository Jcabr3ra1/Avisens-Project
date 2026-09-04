import {
  PERMISOS,
  PERMISOS_POR_ROL,
  esPermisoConocido,
  paresRolPermiso,
  rolTienePermisos,
} from './permisos';
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

// roles_permisos es una proyección de PERMISOS_POR_ROL, no una fuente
// paralela. Estas pruebas cubren lo que el seed necesita para mantenerla
// fiel: saber qué pares deben existir y cuáles códigos ya no.
describe('proyección a roles_permisos', () => {
  it('enumera un par por cada permiso de cada rol', () => {
    const esperados = Object.values(PERMISOS_POR_ROL).reduce(
      (total, permisos) => total + permisos.length,
      0,
    );

    expect(paresRolPermiso()).toHaveLength(esperados);
  });

  it('cada par apunta a un permiso que ese rol realmente tiene', () => {
    for (const { rol, permiso } of paresRolPermiso()) {
      expect(PERMISOS_POR_ROL[rol]).toContain(permiso);
    }
  });

  it('incluye a los tres roles', () => {
    const roles = new Set(paresRolPermiso().map((p) => p.rol));

    expect([...roles].sort()).toEqual([
      'Administrador',
      'Operario',
      'Propietario',
    ]);
  });

  it('reconoce los códigos que existen en el catálogo', () => {
    expect(esPermisoConocido(PERMISOS.INVENTARIO_GESTIONAR)).toBe(true);
    expect(esPermisoConocido(PERMISOS.CATALOGOS_LEER)).toBe(true);
  });

  // Esto es lo que el seed usa para desactivar filas huérfanas: un código
  // que quedó en la base pero ya no existe en el código.
  it('no reconoce un código que ya no existe en el código', () => {
    expect(esPermisoConocido('inventado:borrar')).toBe(false);
    expect(esPermisoConocido('')).toBe(false);
  });
});
