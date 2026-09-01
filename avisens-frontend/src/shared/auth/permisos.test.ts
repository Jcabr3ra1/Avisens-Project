import { describe, expect, it } from 'vitest'
import {
  gestionaAlgo,
  permisosDeGestion,
  ROL_ADMIN,
  ROL_OPERARIO,
  ROL_PROPIETARIO,
} from './permisos'

describe('permisosDeGestion', () => {
  it('el administrador puede crear, editar, alternar y eliminar', () => {
    expect(permisosDeGestion(ROL_ADMIN)).toEqual({
      crear: true,
      editar: true,
      alternarActivo: true,
      eliminar: true,
    })
  })

  it('el propietario es de solo lectura sobre la estructura', () => {
    expect(permisosDeGestion(ROL_PROPIETARIO)).toEqual({
      crear: false,
      editar: false,
      alternarActivo: false,
      eliminar: false,
    })
  })

  it('el operario tampoco gestiona nada', () => {
    expect(gestionaAlgo(permisosDeGestion(ROL_OPERARIO))).toBe(false)
  })

  it('sin sesión no se ofrece ninguna acción', () => {
    expect(gestionaAlgo(permisosDeGestion(null))).toBe(false)
  })

  it('un rol desconocido no hereda permisos por accidente', () => {
    expect(gestionaAlgo(permisosDeGestion('Auditor'))).toBe(false)
  })

  it('gestionaAlgo solo es cierto para quien administra', () => {
    expect(gestionaAlgo(permisosDeGestion(ROL_ADMIN))).toBe(true)
    expect(gestionaAlgo(permisosDeGestion(ROL_PROPIETARIO))).toBe(false)
  })
})
