import { describe, expect, it } from 'vitest'
import type { GalponMonitoreoVista, SensorVista } from '@features/monitoreo/hooks/useMonitoreoAmbiental'
import type { DashboardLote } from './dashboard'
import type { FilaGalpon } from './resumenGranja'
import { tarjetasGalpones, temperaturaDeGalpon } from './tarjetasGalpon'

const ahora = new Date(2026, 10, 23, 10, 0).getTime()
const haceMin = (n: number) => ahora - n * 60_000

function sensor(parcial: Partial<SensorVista> = {}): SensorVista {
  return {
    id: 1, codigo: 'S-1', tipo: 'Temperatura', unidad: '°C', variableUmbral: 'temperatura', valor: 27.4,
    minUmbral: 24, maxUmbral: 30, estado: 'optimo', ultimaLecturaTs: haceMin(5),
    x: null, y: null, esEstado: false, sinCalibrar: false, ...parcial,
  }
}

function fila(parcial: Partial<FilaGalpon> = {}): FilaGalpon {
  return {
    id: 1, nombre: 'Galpón 1', codigo: 'G-1', activo: true,
    lote: { codigo: 'L-1', dia: 23, aves: 1200 }, alertas: 0, urgentes: 0, lecturas: [], ...parcial,
  }
}

function monitoreo(id: number, sensores: SensorVista[]): GalponMonitoreoVista {
  return { id, sensores } as GalponMonitoreoVista
}

const lote: DashboardLote = {
  id: 10, galponId: 1, codigo: 'L-1', fechaIngreso: '2026-11-01', cantidadInicial: 1200, estado: 'activo',
  fechaSalidaEstimada: '2026-12-12',
}

describe('temperaturaDeGalpon', () => {
  it('sin sensores de temperatura no hay lectura', () => {
    expect(temperaturaDeGalpon([], ahora)).toBeNull()
    expect(temperaturaDeGalpon([sensor({ tipo: 'Humedad', variableUmbral: 'humedad' })], ahora)).toBeNull()
  })

  it('un sensor sin señal no da lectura', () => {
    expect(temperaturaDeGalpon([sensor({ valor: null, estado: 'offline', ultimaLecturaTs: null })], ahora)).toBeNull()
  })

  it('lectura reciente dentro del rango: "En rango" y hace cuánto se actualizó', () => {
    expect(temperaturaDeGalpon([sensor()], ahora)).toEqual({
      valorTexto: '27,4 °C', palabra: 'En rango', tono: 'ok', actualizado: 'Actualizado hace 5 min', vigente: true,
    })
  })

  it('alta, baja y muy alta según el rango y el estado del sensor', () => {
    expect(temperaturaDeGalpon([sensor({ valor: 31, estado: 'advertencia' })], ahora)?.palabra).toBe('Alta')
    expect(temperaturaDeGalpon([sensor({ valor: 20, estado: 'advertencia' })], ahora)?.palabra).toBe('Baja')
    expect(temperaturaDeGalpon([sensor({ valor: 36, estado: 'critico' })], ahora)).toMatchObject({ palabra: 'Muy alta', tono: 'critico' })
  })

  it('con varios sensores muestra el más grave', () => {
    const resultado = temperaturaDeGalpon([
      sensor({ id: 1, valor: 27 }),
      sensor({ id: 2, valor: 35, estado: 'critico' }),
    ], ahora)
    expect(resultado?.valorTexto).toBe('35 °C')
  })

  it('con varios igual de bien muestra el más reciente', () => {
    const resultado = temperaturaDeGalpon([
      sensor({ id: 1, valor: 25, ultimaLecturaTs: haceMin(20) }),
      sensor({ id: 2, valor: 28, ultimaLecturaTs: haceMin(2) }),
    ], ahora)
    expect(resultado?.valorTexto).toBe('28 °C')
  })

  it('una lectura vieja no se presenta como actual: queda como "Última" con su antigüedad', () => {
    const resultado = temperaturaDeGalpon([sensor({ ultimaLecturaTs: haceMin(180), estado: 'obsoleta' })], ahora)
    expect(resultado).toMatchObject({ palabra: 'Sin señal', tono: 'sin_datos', vigente: false, actualizado: 'Última: 27,4 °C · hace 3 horas' })
    const vieja = temperaturaDeGalpon([sensor({ valor: 29.4, ultimaLecturaTs: ahora - 34 * 86_400_000, estado: 'obsoleta' })], ahora)
    expect(vieja?.actualizado).toBe('Última: 29,4 °C · hace 34 días')
  })

  it('sin rango definido muestra el valor sin juzgarlo', () => {
    const resultado = temperaturaDeGalpon([sensor({ minUmbral: null, maxUmbral: null, estado: 'sin_umbral' })], ahora)
    expect(resultado).toMatchObject({ palabra: 'Sin rango', tono: 'sin_datos' })
  })
})

describe('tarjetasGalpones', () => {
  it('galpón con lote y temperatura reciente en rango: en rango, con día y total del ciclo', () => {
    const [tarjeta] = tarjetasGalpones({ filas: [fila()], monitoreo: [monitoreo(1, [sensor()])], lotes: [lote], ahora })
    expect(tarjeta).toMatchObject({
      nombre: 'Galpón 1', tono: 'ok', estado: 'En rango',
      lote: { dia: 23, diaTotal: 42, aves: 1200 },
    })
    expect(tarjeta.temperatura?.palabra).toBe('En rango')
  })

  it('sin fecha de salida estimada no inventa el total de días', () => {
    const [tarjeta] = tarjetasGalpones({
      filas: [fila()], monitoreo: [monitoreo(1, [sensor()])], lotes: [{ ...lote, fechaSalidaEstimada: null }], ahora,
    })
    expect(tarjeta.lote?.diaTotal).toBeNull()
  })

  it('galpón sin lote: "Sin lote" y sin día', () => {
    const [tarjeta] = tarjetasGalpones({ filas: [fila({ lote: null })], monitoreo: [monitoreo(1, [sensor()])], lotes: [], ahora })
    expect(tarjeta).toMatchObject({ tono: 'vacio', estado: 'Sin lote', lote: null })
  })

  it('con lote pero sin sensores: "Sin sensores", no "en rango"', () => {
    const [tarjeta] = tarjetasGalpones({ filas: [fila()], monitoreo: [monitoreo(1, [])], lotes: [lote], ahora })
    expect(tarjeta).toMatchObject({ tono: 'sin_datos', estado: 'Sin sensores', temperatura: null })
  })

  it('con lote y sensores que no reportan hace horas: "Sin señal"', () => {
    const [tarjeta] = tarjetasGalpones({
      filas: [fila()], monitoreo: [monitoreo(1, [sensor({ ultimaLecturaTs: haceMin(200), estado: 'obsoleta' })])], lotes: [lote], ahora,
    })
    expect(tarjeta).toMatchObject({ tono: 'sin_datos', estado: 'Sin señal' })
  })

  it('con otros sensores reportando pero sin temperatura: "Sin temperatura"', () => {
    const [tarjeta] = tarjetasGalpones({
      filas: [fila()], monitoreo: [monitoreo(1, [sensor({ tipo: 'Humedad', variableUmbral: 'humedad', unidad: '%' })])], lotes: [lote], ahora,
    })
    expect(tarjeta).toMatchObject({ tono: 'sin_datos', estado: 'Sin temperatura', temperatura: null })
  })

  it('temperatura alta pasa a "Revisar"; muy alta, a "Urgente"', () => {
    const calor = tarjetasGalpones({
      filas: [fila()], monitoreo: [monitoreo(1, [sensor({ valor: 31, estado: 'advertencia' })])], lotes: [lote], ahora,
    })[0]
    const mucho = tarjetasGalpones({
      filas: [fila()], monitoreo: [monitoreo(1, [sensor({ valor: 36, estado: 'critico' })])], lotes: [lote], ahora,
    })[0]
    expect(calor).toMatchObject({ tono: 'atencion', estado: 'Revisar' })
    expect(mucho).toMatchObject({ tono: 'critico', estado: 'Urgente' })
  })

  it('alertas abiertas: ámbar; con una urgente, rojo aunque la temperatura esté bien', () => {
    const una = tarjetasGalpones({ filas: [fila({ alertas: 1 })], monitoreo: [monitoreo(1, [sensor()])], lotes: [lote], ahora })[0]
    const urgente = tarjetasGalpones({ filas: [fila({ alertas: 2, urgentes: 1 })], monitoreo: [monitoreo(1, [sensor()])], lotes: [lote], ahora })[0]
    expect(una.tono).toBe('atencion')
    expect(urgente.tono).toBe('critico')
  })

  it('varios galpones: cada uno con su propia lectura; los inactivos sin lote no salen', () => {
    const tarjetas = tarjetasGalpones({
      filas: [
        fila({ id: 1 }),
        fila({ id: 2, nombre: 'Galpón 2', lote: null }),
        fila({ id: 3, nombre: 'Viejo', activo: false, lote: null }),
      ],
      monitoreo: [monitoreo(1, [sensor({ valor: 25 })]), monitoreo(2, [sensor({ id: 9, valor: 29 })])],
      lotes: [lote],
      ahora,
    })
    expect(tarjetas.map((t) => t.nombre)).toEqual(['Galpón 1', 'Galpón 2'])
    expect(tarjetas[0].temperatura?.valorTexto).toBe('25 °C')
    expect(tarjetas[1].temperatura?.valorTexto).toBe('29 °C')
  })

  it('sin galpones no hay tarjetas', () => {
    expect(tarjetasGalpones({ filas: [], monitoreo: [], lotes: [], ahora })).toEqual([])
  })
})
