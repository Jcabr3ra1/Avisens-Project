import { describe, expect, it } from 'vitest'
import { estadoGranja } from './estadoGranja'
import type { FilaGalpon, ItemAtencionGranja } from './resumenGranja'

function item(parcial: Partial<ItemAtencionGranja>): ItemAtencionGranja {
  return {
    id: 'a', tipo: 'alerta', critico: false, etiqueta: 'Alerta', titulo: 'Temperatura alta',
    detalle: '', cuando: null, orden: 1, galponId: 1, ...parcial,
  }
}

function fila(parcial: Partial<FilaGalpon>): FilaGalpon {
  return {
    id: 1, nombre: 'Galpón 1', codigo: 'GAL-1', activo: true,
    lote: { codigo: 'LOT-1', dia: 9, aves: 500 }, alertas: 0, urgentes: 0, lecturas: [], ...parcial,
  }
}

describe('estadoGranja', () => {
  it('sin pendientes y con un lote dice que todo va bien y propone la guía', () => {
    const estado = estadoGranja({ atencion: [], filas: [fila({})] })
    expect(estado.tono).toBe('ok')
    expect(estado.titulo).toBe('Todo va bien hoy')
    expect(estado.detalle).toBe('LOT-1 va en el día 9 · 500 aves')
    expect(estado.accion).toEqual({ tipo: 'guia', loteCodigo: 'LOT-1' })
  })

  it('con varios lotes resume el total y no propone una guía concreta', () => {
    const estado = estadoGranja({
      atencion: [],
      filas: [fila({}), fila({ id: 2, lote: { codigo: 'LOT-2', dia: 20, aves: 1500 } })],
    })
    expect(estado.detalle).toBe('2 lotes activos · 2.000 aves')
    expect(estado.accion).toBeNull()
  })

  it('una cosa por revisar se dice en singular y lleva a ese pendiente', () => {
    const pendiente = item({ titulo: 'Sensor sin señal' })
    const estado = estadoGranja({ atencion: [pendiente], filas: [fila({})] })
    expect(estado.tono).toBe('atencion')
    expect(estado.titulo).toBe('Hay 1 cosa por revisar')
    expect(estado.detalle).toBe('Sensor sin señal')
    expect(estado.accion).toEqual({ tipo: 'atencion', item: pendiente })
  })

  it('lo urgente manda sobre lo demás aunque llegue después', () => {
    const normal = item({ id: 'n', titulo: 'Humedad alta', orden: 1 })
    const urgente = item({ id: 'u', titulo: 'Temperatura crítica', critico: true, orden: 5 })
    const estado = estadoGranja({ atencion: [normal, urgente], filas: [fila({})] })
    expect(estado.tono).toBe('critico')
    expect(estado.titulo).toBe('Hay 1 cosa urgente en tu granja')
    expect(estado.detalle).toBe('Temperatura crítica')
    expect(estado.accion).toMatchObject({ tipo: 'atencion', item: { id: 'u' } })
  })

  it('con dos urgentes usa el plural', () => {
    const estado = estadoGranja({
      atencion: [item({ id: 'a', critico: true }), item({ id: 'b', critico: true, orden: 2 })],
      filas: [fila({})],
    })
    expect(estado.titulo).toBe('Hay 2 cosas urgentes en tu granja')
  })

  it('sin lote activo no inventa un estado del ciclo', () => {
    const estado = estadoGranja({ atencion: [], filas: [fila({ lote: null })] })
    expect(estado.titulo).toBe('Tu granja está lista para un lote nuevo')
    expect(estado.accion).toBeNull()
  })

  it('un galpón inactivo no cuenta como lote en marcha', () => {
    const estado = estadoGranja({ atencion: [], filas: [fila({ activo: false })] })
    expect(estado.titulo).toBe('Tu granja está lista para un lote nuevo')
  })
})
