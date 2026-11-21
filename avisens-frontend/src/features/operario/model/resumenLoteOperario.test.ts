import { describe, expect, it } from 'vitest'
import type { DashboardAlerta, DashboardIndicador } from '@features/dashboard/model/dashboard'
import {
  avesMuertasDelLote,
  avesVivas,
  calidadCrianza,
  numeroOpcional,
  saludDelLote,
  ultimoConsumoDelLote,
  type ConsumoLote,
} from './resumenLoteOperario'

const indicador = (cambios: Partial<DashboardIndicador> = {}): DashboardIndicador => ({
  fecha: '2026-11-10',
  diaVida: 30,
  pesoPromedioG: 1500,
  fcr: 1.6,
  epef: 342.6,
  mortalidadAcumuladaPct: 2,
  estadoCalculo: 'calculado',
  pesajeFechaSnapshot: '2026-11-10',
  revisionCalculo: 1,
  ...cambios,
})

const alerta = (cambios: Partial<DashboardAlerta> = {}): DashboardAlerta => ({
  id: 1, galponId: 2, criticidad: 'media', mensaje: null, tipo: 'temperatura', estado: 'abierta', fechaCreacion: '2026-11-17', ...cambios,
})

const consumo = (cambios: Partial<ConsumoLote>): ConsumoLote => ({
  id: 1, lote_id: 5, fecha: '2026-11-10T00:00:00.000Z', alimento_kg: 10, agua_litros: 20, alerta_agua_baja: false, ...cambios,
})

describe('aves del lote', () => {
  it('suma solo la mortalidad del lote pedido', () => {
    const registros = [
      { id: 1, lote_id: 5, fecha: '2026-11-01', cantidad_aves: 3 },
      { id: 2, lote_id: 5, fecha: '2026-11-02', cantidad_aves: 2 },
      { id: 3, lote_id: 9, fecha: '2026-11-02', cantidad_aves: 40 },
    ]
    expect(avesMuertasDelLote(5, registros)).toBe(5)
    expect(avesMuertasDelLote(7, registros)).toBe(0)
  })

  it('las aves vivas nunca quedan negativas', () => {
    expect(avesVivas(5000, 81)).toBe(4919)
    expect(avesVivas(10, 15)).toBe(0)
  })
})

describe('ultimoConsumoDelLote', () => {
  it('toma la fecha más reciente y, el mismo día, el último anotado', () => {
    const consumos = [
      consumo({ id: 1, fecha: '2026-11-08T00:00:00.000Z' }),
      consumo({ id: 4, fecha: '2026-11-10T00:00:00.000Z', alimento_kg: 12 }),
      consumo({ id: 3, fecha: '2026-11-10T00:00:00.000Z', alimento_kg: 11 }),
      consumo({ id: 9, lote_id: 8, fecha: '2026-11-15T00:00:00.000Z' }),
    ]
    expect(ultimoConsumoDelLote(5, consumos)?.id).toBe(4)
    expect(ultimoConsumoDelLote(6, consumos)).toBeNull()
  })

  it('convierte los decimales que llegan como texto', () => {
    expect(numeroOpcional('903.4')).toBe(903.4)
    expect(numeroOpcional(null)).toBeNull()
    expect(numeroOpcional('')).toBeNull()
  })
})

describe('calidadCrianza', () => {
  it('redondea el EPEF verificado', () => {
    expect(calidadCrianza(indicador())).toEqual({ tipo: 'valor', valor: 343 })
  })

  it('no muestra un EPEF sin verificar ni sin indicador', () => {
    expect(calidadCrianza(null)).toEqual({ tipo: 'sin_dato' })
    expect(calidadCrianza(indicador({ estadoCalculo: 'legado_sin_verificar' }))).toEqual({ tipo: 'sin_dato' })
  })

  it('marca fuera de rango cuando la conversión es imposible (consumo de prueba)', () => {
    expect(calidadCrianza(indicador({ fcr: 4620.91, epef: 0.4 }))).toEqual({ tipo: 'fuera_de_rango' })
  })
})

describe('saludDelLote', () => {
  const base = { loteId: 5, galponId: 2, alertas: [], eventos: [], reciente: indicador(), hoy: '2026-11-18' }

  it('sin alertas, eventos ni indicador no hay datos', () => {
    expect(saludDelLote({ ...base, reciente: null }).estado).toBe('sin_datos')
  })

  it('una alerta alta activa del galpón lo deja crítico', () => {
    const salud = saludDelLote({ ...base, alertas: [alerta({ criticidad: 'alta' }), alerta({ id: 2 })] })
    expect(salud).toMatchObject({ estado: 'critico', etiqueta: 'Crítico', progreso: 25, alertasActivas: 2 })
  })

  it('ignora alertas cerradas o de otro galpón', () => {
    const alertas = [alerta({ estado: 'cerrada', criticidad: 'alta' }), alerta({ galponId: 9, criticidad: 'alta' })]
    expect(saludDelLote({ ...base, alertas }).estado).toBe('estable')
  })

  it('una alerta media lo deja en atención', () => {
    expect(saludDelLote({ ...base, alertas: [alerta()] }).estado).toBe('atencion')
  })

  it('un evento sanitario de la última semana lo deja en seguimiento', () => {
    const eventos = [
      { id: 1, lote_id: 5, fecha: '2026-11-14T00:00:00.000Z', cantidad_aves: 3 },
      { id: 2, lote_id: 5, fecha: '2026-10-01T00:00:00.000Z', cantidad_aves: 40 },
    ]
    expect(saludDelLote({ ...base, eventos })).toMatchObject({ estado: 'seguimiento', avesEnSeguimiento: 3 })
  })

  it('con eventos viejos y sin alertas está estable', () => {
    const eventos = [{ id: 2, lote_id: 5, fecha: '2026-10-01T00:00:00.000Z', cantidad_aves: 40 }]
    expect(saludDelLote({ ...base, eventos })).toMatchObject({ estado: 'estable', progreso: 100 })
  })
})
