import { describe, expect, it } from 'vitest'
import { diasDeVida, fechaDeHoy, semanaDeVida } from './fechas'

// Estas pruebas afirman cosas sobre "el día local", así que solo significan
// algo con una zona fija. Se ancla en la del usuario real (Colombia, UTC-5)
// desde el script de pruebas; sin eso pasaban en la máquina de quien las
// escribió y fallaban en CI, que corre en UTC.

// Hora local del entorno de pruebas; lo que importa es que el corte ocurra a
// medianoche local y no a una hora cualquiera de la tarde.
function local(iso: string): Date {
  return new Date(iso)
}

describe('diasDeVida', () => {
  it('el día de ingreso es el día 1', () => {
    // Convención de la avicultura, y la que usan las curvas objetivo:
    // están sembradas en los días 7, 14, 21, 28, 35 y 42.
    expect(diasDeVida('2026-08-12', local('2026-08-12T10:00:00'))).toBe(1)
  })

  it('no avanza por la tarde del mismo día', () => {
    // Este era el bug: restando milisegundos contra medianoche UTC, a las
    // 7 p.m. en Colombia la diferencia ya pasaba de 24 h y saltaba a 1.
    expect(diasDeVida('2026-08-12', local('2026-08-12T19:30:00'))).toBe(1)
    expect(diasDeVida('2026-08-12', local('2026-08-12T23:59:00'))).toBe(1)
  })

  it('avanza a medianoche, no antes', () => {
    expect(diasDeVida('2026-08-12', local('2026-08-13T00:01:00'))).toBe(2)
    expect(diasDeVida('2026-08-12', local('2026-08-13T06:00:00'))).toBe(2)
  })

  it('un ciclo de engorde termina en el día 42', () => {
    // 41 días después del ingreso: el día 42 del ciclo, que es donde está
    // el último punto de la curva objetivo.
    expect(diasDeVida('2026-08-12', local('2026-09-22T08:00:00'))).toBe(42)
  })

  it('una fecha futura nunca baja del día 1', () => {
    expect(diasDeVida('2026-09-10', local('2026-09-01T12:00:00'))).toBe(1)
  })

  it('acepta también una fecha con hora, no solo el día suelto', () => {
    expect(diasDeVida('2026-08-12T00:00:00', local('2026-08-15T09:00:00'))).toBe(4)
  })

  it('una fecha inválida no rompe la pantalla', () => {
    expect(diasDeVida('no-es-fecha', local('2026-08-15T09:00:00'))).toBe(1)
  })

  it('cruza el cambio de mes sin perder un día', () => {
    expect(diasDeVida('2026-08-30', local('2026-09-02T10:00:00'))).toBe(4)
  })
})

describe('semanaDeVida', () => {
  it('la primera semana son los días 1 al 7', () => {
    // Con el día empezando en 1, dividir sin restar antes haría que el
    // día 7 cayera ya en la semana siguiente y la primera durara seis.
    expect(semanaDeVida(1)).toBe(0)
    expect(semanaDeVida(7)).toBe(0)
  })

  it('el día 8 abre la segunda semana', () => {
    expect(semanaDeVida(8)).toBe(1)
    expect(semanaDeVida(14)).toBe(1)
  })

  it('cada semana dura exactamente siete días', () => {
    for (let semana = 0; semana < 6; semana += 1) {
      expect(semanaDeVida(semana * 7 + 1)).toBe(semana)
      expect(semanaDeVida(semana * 7 + 7)).toBe(semana)
    }
  })

  it('el día 42 cierra la sexta semana, final del ciclo', () => {
    expect(semanaDeVida(42)).toBe(5)
  })

  it('un valor absurdo no produce una semana negativa', () => {
    expect(semanaDeVida(0)).toBe(0)
    expect(semanaDeVida(-3)).toBe(0)
  })
})

describe('fechaDeHoy', () => {
  it('devuelve el día local, no el de UTC', () => {
    // A las 8:30 p.m. en Colombia, toISOString() ya está en el día siguiente.
    expect(fechaDeHoy(new Date('2026-09-02T20:30:00-05:00'))).toBe('2026-09-02')
  })

  it('sigue acertando de madrugada', () => {
    expect(fechaDeHoy(new Date('2026-09-02T00:30:00-05:00'))).toBe('2026-09-02')
  })

  it('rellena con cero el mes y el día', () => {
    expect(fechaDeHoy(new Date('2026-01-05T12:00:00'))).toBe('2026-01-05')
  })

  it('cambia de día a medianoche local', () => {
    expect(fechaDeHoy(new Date('2026-09-02T23:59:00-05:00'))).toBe('2026-09-02')
    expect(fechaDeHoy(new Date('2026-09-03T00:01:00-05:00'))).toBe('2026-09-03')
  })
})
