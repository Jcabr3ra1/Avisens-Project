import { describe, expect, it } from 'vitest'
import {
  equiposPorMantener,
  etiquetaEstadoEquipo,
  numeroOpcional,
  porcentajeDesgaste,
  requiereMantenimiento,
} from './equipo'

describe('numeroOpcional', () => {
  it('distingue vacío de cero: en blanco es "no lo sé", no "vale 0"', () => {
    expect(numeroOpcional('')).toBeUndefined()
    expect(numeroOpcional('   ')).toBeUndefined()
    expect(numeroOpcional('0')).toBe(0)
  })

  it('descarta lo que no es número', () => {
    expect(numeroOpcional('abc')).toBeUndefined()
  })

  it('convierte enteros y decimales', () => {
    expect(numeroOpcional('1500')).toBe(1500)
    expect(numeroOpcional('3.5')).toBe(3.5)
  })
})

describe('porcentajeDesgaste', () => {
  it('no calcula nada sin vida útil declarada', () => {
    // Devolver 0 sería afirmar "está nuevo", que no es lo mismo que "no se sabe".
    expect(porcentajeDesgaste(500, null)).toBeNull()
    expect(porcentajeDesgaste(500, 0)).toBeNull()
  })

  it('trata las horas sin registrar como cero uso', () => {
    expect(porcentajeDesgaste(null, 1000)).toBe(0)
  })

  it('calcula el porcentaje y lo redondea', () => {
    expect(porcentajeDesgaste(500, 1000)).toBe(50)
    expect(porcentajeDesgaste(333, 1000)).toBe(33)
  })

  it('no pasa de 100 aunque el equipo haya superado su vida útil', () => {
    expect(porcentajeDesgaste(2500, 1000)).toBe(100)
  })
})

describe('requiereMantenimiento', () => {
  it('avisa desde el 95 % de la vida útil', () => {
    expect(requiereMantenimiento(94)).toBe(false)
    expect(requiereMantenimiento(95)).toBe(true)
    expect(requiereMantenimiento(100)).toBe(true)
  })

  it('no avisa si el equipo no declara vida útil', () => {
    expect(requiereMantenimiento(null)).toBe(false)
  })
})

describe('equiposPorMantener', () => {
  const equipo = (estado_actual: string, horas_operacion: number | null, vida_util_horas: number | null) =>
    ({ estado_actual, horas_operacion, vida_util_horas })

  it('cuenta solo los operativos que llegaron al umbral', () => {
    const equipos = [
      equipo('operativo', 960, 1000),
      equipo('operativo', 500, 1000),
      equipo('en_mantenimiento', 990, 1000),
      equipo('baja', 1000, 1000),
      equipo('operativo', 5000, null),
    ]
    expect(equiposPorMantener(equipos)).toEqual([equipos[0]])
  })
})

describe('etiquetaEstadoEquipo', () => {
  it('traduce los estados del backend a texto legible', () => {
    expect(etiquetaEstadoEquipo('en_mantenimiento')).toBe('En mantenimiento')
    expect(etiquetaEstadoEquipo('baja')).toBe('De baja')
  })

  it('deja pasar un estado desconocido tal cual', () => {
    expect(etiquetaEstadoEquipo('reparado')).toBe('reparado')
  })
})
