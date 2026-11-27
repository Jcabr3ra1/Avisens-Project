import { describe, expect, it } from 'vitest'
import type { GalponMonitoreoVista } from '@features/monitoreo/hooks/useMonitoreoAmbiental'
import type { Granja, PropietarioGranja } from '../api/granjas'
import {
  calcularEtapasImplementacionGranjas,
  type EstadoImplementacionGranja,
} from './implementacion'

function propietario(id: number, nombre: string): PropietarioGranja {
  return { id, nombre_completo: nombre } as PropietarioGranja
}

function granja(id: number, propietarioId: number, activa = true): Granja {
  return {
    id,
    nombre: `Granja ${id}`,
    activa,
    propietario: { id: propietarioId, nombre_completo: 'x' },
  } as Granja
}

function galpon(id: number, granjaId: number, conLoteActivo = false): GalponMonitoreoVista {
  return {
    id,
    granjaId,
    loteActivo: conLoteActivo ? ({ id: id * 10 } as never) : null,
    sensores: [],
  } as unknown as GalponMonitoreoVista
}

// En qué etapa cayó un propietario, que es lo que el tablero comunica.
function etapaDe(
  etapas: ReturnType<typeof calcularEtapasImplementacionGranjas>,
  propietarioId: number,
): EstadoImplementacionGranja | null {
  return (
    etapas.find((etapa) => etapa.tarjetas.some((tarjeta) => tarjeta.id === propietarioId))?.id ??
    null
  )
}

describe('calcularEtapasImplementacionGranjas', () => {
  it('devuelve siempre las cuatro etapas, aunque estén vacías', () => {
    const etapas = calcularEtapasImplementacionGranjas([], [], [])
    expect(etapas.map((etapa) => etapa.id)).toEqual([
      'sin_granja',
      'sin_galpon',
      'sin_lote',
      'operativa',
    ])
    expect(etapas.every((etapa) => etapa.tarjetas.length === 0)).toBe(true)
  })

  it('un propietario sin granjas cae en "sin granja"', () => {
    const etapas = calcularEtapasImplementacionGranjas([propietario(1, 'Ana')], [], [])
    expect(etapaDe(etapas, 1)).toBe('sin_granja')
  })

  it('una granja inactiva no cuenta como granja asignada', () => {
    const etapas = calcularEtapasImplementacionGranjas(
      [propietario(1, 'Ana')],
      [granja(10, 1, false)],
      [galpon(100, 10)],
    )
    expect(etapaDe(etapas, 1)).toBe('sin_granja')
  })

  it('con granja activa pero sin galpones cae en "sin galpón"', () => {
    const etapas = calcularEtapasImplementacionGranjas(
      [propietario(1, 'Ana')],
      [granja(10, 1)],
      [],
    )
    expect(etapaDe(etapas, 1)).toBe('sin_galpon')
  })

  it('con galpones pero ningún lote activo cae en "sin lote"', () => {
    const etapas = calcularEtapasImplementacionGranjas(
      [propietario(1, 'Ana')],
      [granja(10, 1)],
      [galpon(100, 10, false)],
    )
    expect(etapaDe(etapas, 1)).toBe('sin_lote')
  })

  it('con al menos un lote activo pasa a producción', () => {
    const etapas = calcularEtapasImplementacionGranjas(
      [propietario(1, 'Ana')],
      [granja(10, 1)],
      [galpon(100, 10, false), galpon(101, 10, true)],
    )
    expect(etapaDe(etapas, 1)).toBe('operativa')
  })

  it('no cuenta los galpones de la granja de otro propietario', () => {
    const etapas = calcularEtapasImplementacionGranjas(
      [propietario(1, 'Ana'), propietario(2, 'Beto')],
      [granja(10, 1), granja(20, 2)],
      [galpon(200, 20, true)],
    )
    // Ana tiene granja pero el galpón es de la de Beto.
    expect(etapaDe(etapas, 1)).toBe('sin_galpon')
    expect(etapaDe(etapas, 2)).toBe('operativa')
  })

  it('resume las cifras del propietario en su tarjeta', () => {
    const etapas = calcularEtapasImplementacionGranjas(
      [propietario(1, 'Ana')],
      [granja(10, 1), granja(11, 1)],
      [galpon(100, 10, true), galpon(101, 11, false)],
    )
    const tarjeta = etapas
      .flatMap((etapa) => etapa.tarjetas)
      .find((item) => item.id === 1)
    expect(tarjeta).toMatchObject({
      granjasActivas: 2,
      totalGalpones: 2,
      lotesActivos: 1,
      granjaId: 10,
    })
  })

  it('sin granja activa la tarjeta no apunta a ninguna', () => {
    const etapas = calcularEtapasImplementacionGranjas([propietario(1, 'Ana')], [], [])
    expect(etapas[0].tarjetas[0].granjaId).toBeNull()
  })

  it('ordena por nombre dentro de cada etapa', () => {
    const etapas = calcularEtapasImplementacionGranjas(
      [propietario(1, 'Zulema'), propietario(2, 'Ana'), propietario(3, 'Óscar')],
      [],
      [],
    )
    expect(etapas[0].tarjetas.map((tarjeta) => tarjeta.nombre)).toEqual([
      'Ana',
      'Óscar',
      'Zulema',
    ])
  })
})
