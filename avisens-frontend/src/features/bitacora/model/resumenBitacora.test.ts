import { describe, expect, it } from 'vitest'
import type { ConsumoDiario } from '@features/consumos-diarios/api/consumosDiarios'
import type { EventoSanitario, Mortalidad, Pesaje } from './bitacora'
import {
  calcularResumenBitacora,
  crearFilasRegistro,
  filtrarRegistrosPorLote,
} from './resumenBitacora'

const pesaje = (id: number, loteId: number, peso: number): Pesaje => ({
  id,
  lote_id: loteId,
  fecha: '2026-09-01',
  peso_promedio_g: peso,
  cantidad_aves_pesadas: null,
  peso_objetivo_g: null,
  observaciones: null,
})

const mortalidad = (id: number, loteId: number, cantidad: number): Mortalidad => ({
  id,
  lote_id: loteId,
  fecha: '2026-09-01',
  cantidad_aves: cantidad,
  causa_presuntiva: null,
  disposicion: null,
  observaciones: null,
})

const sanitario = (id: number, loteId: number): EventoSanitario => ({
  id,
  lote_id: loteId,
  fecha: '2026-09-01',
  tipo: 'vacunacion',
  producto: null,
  diagnostico: null,
  cantidad_aves: null,
  observaciones: null,
})

const consumo = (id: number, loteId: number, alimento: number, agua: number): ConsumoDiario => ({
  id,
  lote_id: loteId,
  tipo_alimento_id: null,
  usuario_id: 1,
  fecha: '2026-09-01',
  alimento_kg: alimento,
  agua_litros: agua,
  alerta_agua_baja: false,
  metodo_registro: 'manual',
  fecha_registro: '2026-09-01T12:00:00.000Z',
  lote: { id: loteId, codigo: `L-${loteId}` },
  tipo_alimento: null,
})

describe('resumenBitacora', () => {
  it('filtra los registros por lote', () => {
    expect(filtrarRegistrosPorLote([pesaje(1, 10, 1200), pesaje(2, 20, 1300)], 10)).toHaveLength(1)
  })

  it('calcula las métricas del lote seleccionado', () => {
    const resumen = calcularResumenBitacora(
      [pesaje(1, 10, 1200)],
      [mortalidad(2, 10, 3)],
      [sanitario(3, 10)],
      [consumo(4, 10, 12.5, 80)],
    )

    expect(resumen).toMatchObject({ alimentoKg: 12.5, aguaLitros: 80, avesMuertas: 3, totalRegistros: 4 })
    expect(resumen.ultimoPeso?.peso_promedio_g).toBe(1200)
  })

  it('crea filas según la pestaña solicitada', () => {
    const filas = crearFilasRegistro('peso', [pesaje(1, 10, 1200)], [], [])
    expect(filas).toEqual([{ id: 1, fecha: '2026-09-01', principal: '1.200 g', detalle: 'Sin observaciones' }])
  })
})
