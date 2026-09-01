import { describe, expect, it } from 'vitest'
import { puedeAcceder, ROL_ADMIN, ROL_OPERARIO, ROL_PROPIETARIO } from './navConfig'

describe('puedeAcceder', () => {
  it('respeta la tabla en rutas exactas', () => {
    expect(puedeAcceder('/auditoria', ROL_ADMIN)).toBe(true)
    expect(puedeAcceder('/auditoria', ROL_PROPIETARIO)).toBe(false)
  })

  it('sin sesión no se accede a nada', () => {
    expect(puedeAcceder('/dashboard', null)).toBe(false)
  })

  it('una ruta que no está en la tabla queda cerrada', () => {
    expect(puedeAcceder('/ruta-inventada', ROL_ADMIN)).toBe(false)
  })

  it('resuelve el detalle de granja por su patrón dinámico', () => {
    expect(puedeAcceder('/granjas/5', ROL_ADMIN)).toBe(true)
    expect(puedeAcceder('/granjas/5', ROL_PROPIETARIO)).toBe(true)
    expect(puedeAcceder('/granjas/5', ROL_OPERARIO)).toBe(false)
  })

  it('el patrón no traga un segmento vacío', () => {
    expect(puedeAcceder('/granjas/', ROL_ADMIN)).toBe(false)
  })

  it('el patrón no se come rutas más profundas', () => {
    expect(puedeAcceder('/granjas/5/galpones', ROL_ADMIN)).toBe(false)
  })

  it('la coincidencia exacta gana sobre el patrón', () => {
    // /granjas está en la tabla por su cuenta; no debe resolverse como si
    // fuera un id de granja.
    expect(puedeAcceder('/granjas', ROL_OPERARIO)).toBe(false)
    expect(puedeAcceder('/granjas', ROL_PROPIETARIO)).toBe(true)
  })
})
