import { describe, expect, it } from 'vitest'
import { cifrasCabecera } from './cabecera'
import type { FilaGalpon } from './resumenGranja'

function fila(parcial: Partial<FilaGalpon> = {}): FilaGalpon {
  return {
    id: 1, nombre: 'Galpón 1', codigo: 'G-1', activo: true,
    lote: { codigo: 'L-1', dia: 9, aves: 500 }, alertas: 0, urgentes: 0, lecturas: [], ...parcial,
  }
}

describe('cifrasCabecera', () => {
  it('resume galpones con lote, aves ingresadas, alertas y sensores en línea', () => {
    const cifras = cifrasCabecera(
      [fila(), fila({ id: 2, lote: { codigo: 'L-2', dia: 3, aves: 1200 }, alertas: 2 }), fila({ id: 3, lote: null })],
      { estado: 'listo', total: 4, vigentes: 3 },
    )
    expect(cifras).toEqual([
      { id: 'galpones', etiqueta: 'Galpones con lote', valor: '2/3', alerta: false },
      { id: 'aves', etiqueta: 'Aves ingresadas', valor: '1.700', alerta: false },
      { id: 'alertas', etiqueta: 'Alertas abiertas', valor: '2', alerta: true },
      { id: 'sensores', etiqueta: 'Sensores en línea', valor: '3/4', alerta: true },
    ])
  })

  it('no cuenta galpones inactivos como disponibles ni inventa sensores mientras cargan', () => {
    const cifras = cifrasCabecera([fila(), fila({ id: 2, activo: false, lote: null })], { estado: 'cargando' })
    expect(cifras[0].valor).toBe('1/1')
    expect(cifras[3]).toMatchObject({ valor: '—', alerta: false })
  })

  it('todos los sensores reportando no se marca', () => {
    const cifras = cifrasCabecera([fila()], { estado: 'listo', total: 2, vigentes: 2 })
    expect(cifras[3]).toMatchObject({ valor: '2/2', alerta: false })
  })
})
