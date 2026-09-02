import { describe, expect, it } from 'vitest'
import { diasDeVida, semanaDeVida } from './fechas'

// Hora local del entorno de pruebas; lo que importa es que el corte ocurra a
// medianoche local y no a una hora cualquiera de la tarde.
function local(iso: string): Date {
  return new Date(iso)
}

describe('diasDeVida', () => {
  it('el día de ingreso es el día 0', () => {
    expect(diasDeVida('2026-08-12', local('2026-08-12T10:00:00'))).toBe(0)
  })

  it('no avanza por la tarde del mismo día', () => {
    // Este era el bug: restando milisegundos contra medianoche UTC, a las
    // 7 p.m. en Colombia la diferencia ya pasaba de 24 h y saltaba a 1.
    expect(diasDeVida('2026-08-12', local('2026-08-12T19:30:00'))).toBe(0)
    expect(diasDeVida('2026-08-12', local('2026-08-12T23:59:00'))).toBe(0)
  })

  it('avanza a medianoche, no antes', () => {
    expect(diasDeVida('2026-08-12', local('2026-08-13T00:01:00'))).toBe(1)
    expect(diasDeVida('2026-08-12', local('2026-08-13T06:00:00'))).toBe(1)
  })

  it('cuenta un ciclo completo de engorde', () => {
    expect(diasDeVida('2026-08-12', local('2026-09-23T08:00:00'))).toBe(42)
  })

  it('una fecha futura no da días negativos', () => {
    expect(diasDeVida('2026-09-10', local('2026-09-01T12:00:00'))).toBe(0)
  })

  it('acepta también una fecha con hora, no solo el día suelto', () => {
    expect(diasDeVida('2026-08-12T00:00:00', local('2026-08-15T09:00:00'))).toBe(3)
  })

  it('una fecha inválida no rompe la pantalla', () => {
    expect(diasDeVida('no-es-fecha', local('2026-08-15T09:00:00'))).toBe(0)
  })

  it('cruza el cambio de mes sin perder un día', () => {
    expect(diasDeVida('2026-08-30', local('2026-09-02T10:00:00'))).toBe(3)
  })
})

describe('semanaDeVida', () => {
  it('la primera semana es la 0 y dura siete días', () => {
    expect(semanaDeVida(0)).toBe(0)
    expect(semanaDeVida(6)).toBe(0)
  })

  it('el día 7 abre la semana 1', () => {
    expect(semanaDeVida(7)).toBe(1)
  })

  it('el día 41 sigue en la semana 5, ya al final del ciclo', () => {
    expect(semanaDeVida(41)).toBe(5)
  })

  it('un día negativo no produce una semana negativa', () => {
    expect(semanaDeVida(-3)).toBe(0)
  })
})
