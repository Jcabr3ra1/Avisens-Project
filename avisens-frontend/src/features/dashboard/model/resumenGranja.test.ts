import { describe, expect, it } from 'vitest'
import type { GalponMonitoreoVista, SensorVista } from '@features/monitoreo/hooks/useMonitoreoAmbiental'
import type { DashboardAlerta, DashboardGalpon, DashboardLote } from './dashboard'
import type { LoteResumenCrecimiento } from '@features/indicadores/api/indicadores'
import { filasGalpones, itemsAtencionGranja, kpisGranja, lotesActivosDe } from './resumenGranja'

const galpones: DashboardGalpon[] = [
  { id: 1, granjaId: 9, codigo: 'G-1', nombre: 'Galpón norte', activo: true },
  { id: 2, granjaId: 9, codigo: 'G-2', nombre: 'Galpón sur', activo: true },
  { id: 3, granjaId: 9, codigo: 'G-3', nombre: 'Antiguo', activo: false },
]

const lotes: DashboardLote[] = [
  { id: 10, galponId: 1, codigo: 'L-10', fechaIngreso: '2026-10-01', cantidadInicial: 5000, estado: 'activo' },
  { id: 11, galponId: 2, codigo: 'L-11', fechaIngreso: '2026-08-01', cantidadInicial: 4000, estado: 'cerrado' },
  { id: 12, galponId: 99, codigo: 'L-12', fechaIngreso: '2026-10-01', cantidadInicial: 7000, estado: 'activo' },
]

function alerta(id: number, galponId: number, criticidad: string, estado = 'abierta'): DashboardAlerta {
  return { id, galponId, criticidad, estado, mensaje: `Alerta ${id}`, tipo: 'temperatura', fechaCreacion: '2026-10-17T10:00:00.000Z' }
}

function sensor(id: number, estado: SensorVista['estado'], cambios: Partial<SensorVista> = {}): SensorVista {
  return {
    id, codigo: `S-${id}`, tipo: 'Temperatura', unidad: '°C', variableUmbral: 'temperatura',
    valor: 27.4, minUmbral: 24, maxUmbral: 30, estado, ultimaLecturaTs: Date.parse('2026-10-17T11:00:00.000Z'),
    x: null, y: null, esEstado: false, sinCalibrar: false, ...cambios,
  }
}

function galponMonitoreo(id: number, sensores: SensorVista[]): GalponMonitoreoVista {
  return { id, sensores, nombre: galpones.find((g) => g.id === id)?.nombre ?? '' } as GalponMonitoreoVista
}

describe('lotesActivosDe', () => {
  it('solo cuenta lotes activos de los galpones de la granja', () => {
    expect(lotesActivosDe(galpones, lotes).map((lote) => lote.id)).toEqual([10])
  })
})

describe('kpisGranja', () => {
  it('resume galpones con lote, aves, alertas y sensores de la granja', () => {
    const kpis = kpisGranja({
      galpones,
      lotes,
      alertas: [alerta(1, 1, 'alta'), alerta(2, 2, 'media'), alerta(3, 1, 'alta', 'cerrada')],
      sensores: [sensor(1, 'optimo'), sensor(2, 'offline'), sensor(3, 'critico')],
    })

    expect(kpis.map((kpi) => [kpi.id, kpi.valor, kpi.detalle, kpi.progreso])).toEqual([
      ['galpones', '1/2', '1 galpón sin lote', 50],
      ['aves', '5.000', 'Al ingreso · 1 lote activo', null],
      ['alertas', '2', '1 crítica', null],
      ['sensores', '2/3', '1 sin señal', 67],
    ])
  })

  it('dice claramente cuando no hay nada que medir', () => {
    const kpis = kpisGranja({ galpones: [], lotes: [], alertas: [], sensores: [] })

    expect(kpis.map((kpi) => kpi.detalle)).toEqual([
      'Sin galpones activos', 'Sin lotes activos', 'Sin incidencias', 'Sin sensores registrados',
    ])
    expect(kpis[0].progreso).toBeNull()
  })
})

describe('itemsAtencionGranja', () => {
  const monitoreo = [
    galponMonitoreo(1, [sensor(1, 'optimo'), sensor(2, 'critico', { valor: 33.2 })]),
    galponMonitoreo(2, [sensor(3, 'offline', { ultimaLecturaTs: null }), sensor(4, 'lectura_no_disponible')]),
  ]

  it('junta alertas abiertas y sensores con problemas, críticos primero', () => {
    const items = itemsAtencionGranja({
      alertas: [alerta(1, 2, 'media'), alerta(2, 1, 'alta', 'cerrada'), alerta(3, 77, 'alta')],
      galpones,
      monitoreo,
      ahora: Date.parse('2026-10-17T12:00:00.000Z'),
    })

    expect(items.map((item) => item.id)).toEqual(['sensor-2', 'alerta-1', 'sensor-3'])
    expect(items[0]).toMatchObject({
      critico: true,
      etiqueta: 'Fuera de rango',
      titulo: 'Temperatura en 33,2 °C',
      detalle: 'Galpón norte · rango 24–30 °C',
    })
    expect(items[1]).toMatchObject({ etiqueta: 'Alerta atención', detalle: 'Galpón sur' })
    expect(items[2]).toMatchObject({ etiqueta: 'Sin señal', detalle: 'Galpón sur · nunca ha reportado', cuando: null })
  })

  it('incluye riesgos de crecimiento por lote, prioriza su posición y deja abrir la guía', () => {
    const riesgo = {
      lote_id: 10,
      codigo: 'L-10',
      granja_id: 9,
      granja: 'Granja norte',
      galpon_id: 1,
      galpon: 'Galpón norte',
      dia_vida: 20,
      estado_indicador: 'calculado',
      estado_peso: 'disponible',
      peso_actual_g: 800,
      peso_esperado_g: 900,
      veredicto_peso: 'por_debajo',
      desvio_peso_pct: -11,
      fcr: 1.6,
      fcr_objetivo: 1.5,
      mortalidad_acumulada_pct: 2,
      consumo_acumulado_g: 1200,
      consumo_esperado_g: 1250,
      desvio_consumo_pct: -4,
      fecha_pesaje: '2026-10-17',
      antiguedad_pesaje_dias: 0,
      puntuacion: 1,
      posicion_riesgo: 1,
      motivo_principal: null,
      alertas: [{
        regla: 'peso_por_debajo',
        titulo: 'Peso por debajo de la curva',
        por_que: 'El peso está 11 % por debajo de la curva de referencia.',
        que_hacer: 'Revisa los últimos pesajes.',
        provisional: false,
      }],
    } as LoteResumenCrecimiento
    const items = itemsAtencionGranja({
      alertas: [],
      galpones,
      monitoreo: [],
      riesgosCrecimiento: [riesgo],
    })

    expect(items[0]).toMatchObject({
      id: 'crecimiento-10-peso_por_debajo',
      tipo: 'crecimiento',
      loteId: 10,
      galponId: 1,
      titulo: 'Peso por debajo de la curva',
      etiqueta: 'Crecimiento',
    })
  })
})

describe('filasGalpones', () => {
  it('ordena activos primero y resume lote, alertas y lecturas', () => {
    const filas = filasGalpones({
      galpones,
      lotes,
      alertas: [alerta(1, 1, 'alta'), alerta(2, 1, 'media')],
      monitoreo: [galponMonitoreo(1, [sensor(1, 'optimo'), sensor(2, 'optimo', { tipo: 'Humedad', unidad: '%', valor: 63.5 })])],
      hoy: new Date('2026-10-17T12:00:00'),
    })

    expect(filas.map((fila) => fila.nombre)).toEqual(['Galpón norte', 'Galpón sur', 'Antiguo'])
    expect(filas[0]).toMatchObject({
      lote: { codigo: 'L-10', dia: 17, aves: 5000 },
      alertas: 2,
      urgentes: 1,
      lecturas: ['27,4 °C', '63,5 %'],
    })
    expect(filas[1].lote).toBeNull()
  })
})
