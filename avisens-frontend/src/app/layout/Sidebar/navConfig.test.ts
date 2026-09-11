import { describe, expect, it } from 'vitest'
import {
  puedeAcceder,
  rutaInicioPorRol,
  ROL_ADMIN,
  ROL_OPERARIO,
  ROL_PROPIETARIO,
} from './navConfig'

describe('puedeAcceder', () => {
  it('respeta la tabla de permisos por ruta', () => {
    expect(puedeAcceder('/auditoria', ROL_ADMIN)).toBe(true)
    expect(puedeAcceder('/auditoria', ROL_PROPIETARIO)).toBe(false)
  })

  it('sin sesión no se accede a nada', () => {
    expect(puedeAcceder('/dashboard', null)).toBe(false)
  })

  it('una ruta que no está en la tabla queda cerrada', () => {
    // La tabla es la única fuente de verdad: lo que no está, no se abre.
    expect(puedeAcceder('/ruta-inventada', ROL_ADMIN)).toBe(false)
  })

  it('granjas es del admin y del propietario, no del operario', () => {
    expect(puedeAcceder('/granjas', ROL_ADMIN)).toBe(true)
    expect(puedeAcceder('/granjas', ROL_PROPIETARIO)).toBe(true)
    expect(puedeAcceder('/granjas', ROL_OPERARIO)).toBe(false)
  })

  it('mi jornada es solo del operario', () => {
    expect(puedeAcceder('/mi-jornada', ROL_OPERARIO)).toBe(true)
    expect(puedeAcceder('/mi-jornada', ROL_ADMIN)).toBe(false)
  })

  it('cada rol tiene su inicio operativo propio', () => {
    expect(puedeAcceder('/dashboard', ROL_PROPIETARIO)).toBe(true)
    expect(puedeAcceder('/dashboard', ROL_ADMIN)).toBe(false)
    expect(puedeAcceder('/dashboard', ROL_OPERARIO)).toBe(false)
    expect(rutaInicioPorRol(ROL_ADMIN)).toBe('/admin')
    expect(rutaInicioPorRol(ROL_PROPIETARIO)).toBe('/dashboard')
    expect(rutaInicioPorRol(ROL_OPERARIO)).toBe('/mi-jornada')
  })
})

describe('el administrador no ve datos financieros del cliente', () => {
  it('/finanzas es solo del propietario', () => {
    // El estado de resultados de una granja es información de su dueño y no
    // tiene finalidad en la operación de la plataforma. El backend ya acota
    // por propietario; esta tabla cierra la puerta de la interfaz.
    expect(puedeAcceder('/finanzas', ROL_PROPIETARIO)).toBe(true)
    expect(puedeAcceder('/finanzas', ROL_ADMIN)).toBe(false)
    expect(puedeAcceder('/finanzas', ROL_OPERARIO)).toBe(false)
  })

  it('el administrador conserva lo que sí es suyo', () => {
    // Operar la plataforma: soporte, trazabilidad, catálogos y el embudo
    // comercial. Nada de eso son datos productivos de un cliente.
    for (const ruta of ['/auditoria', '/catalogos', '/crm', '/solicitudes-pqrs']) {
      expect(puedeAcceder(ruta, ROL_ADMIN)).toBe(true)
    }
  })
})
