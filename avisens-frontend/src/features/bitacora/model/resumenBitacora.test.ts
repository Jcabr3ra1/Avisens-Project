import { describe, expect, it } from 'vitest'
import type { ConsumoDiario } from '@features/consumos-diarios/api/consumosDiarios'
import type { EventoSanitario, Mortalidad, Pesaje } from './bitacora'
import {
  calcularResumenBitacora,
  calcularSaludCicloLote,
  crearActividadReciente,
  crearFilasRegistro,
  filtrarRegistrosPorLote,
} from './resumenBitacora'

const pesaje = (id: number, loteId: number, peso: number, fecha = '2026-09-01'): Pesaje => ({
  id,
  lote_id: loteId,
  fecha,
  peso_promedio_g: peso,
  cantidad_aves_pesadas: null,
  peso_objetivo_g: null,
  observaciones: null,
})

const mortalidad = (id: number, loteId: number, cantidad: number, fecha = '2026-09-01'): Mortalidad => ({
  id,
  lote_id: loteId,
  fecha,
  cantidad_aves: cantidad,
  causa_presuntiva: null,
  disposicion: null,
  observaciones: null,
})

const sanitario = (id: number, loteId: number, fecha = '2026-09-01'): EventoSanitario => ({
  id,
  lote_id: loteId,
  fecha,
  tipo: 'vacunacion',
  producto: null,
  diagnostico: null,
  cantidad_aves: null,
  observaciones: null,
})

const consumo = (
  id: number,
  loteId: number,
  alimento: number,
  agua: number,
  fecha = '2026-09-01',
): ConsumoDiario => ({
  id,
  lote_id: loteId,
  tipo_alimento_id: null,
  usuario_id: 1,
  fecha,
  alimento_kg: alimento,
  agua_litros: agua,
  alerta_agua_baja: false,
  metodo_registro: 'manual',
  fecha_registro: `${fecha}T12:00:00.000Z`,
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
    const filas = crearFilasRegistro('peso', [pesaje(1, 10, 1200), pesaje(2, 10, 450)], [], [])
    expect(filas).toEqual([
      { id: 1, fecha: '2026-09-01', principal: '1,20 kg', detalle: 'Sin observaciones' },
      { id: 2, fecha: '2026-09-01', principal: '450 g', detalle: 'Sin observaciones' },
    ])

    const filasMortalidad = crearFilasRegistro(
      'mortalidad',
      [],
      [
        { ...mortalidad(3, 10, 2), foto_mime_type: 'image/jpeg' },
        { ...mortalidad(4, 10, 1), foto_mime_type: null },
      ],
      [],
    )
    expect(filasMortalidad).toEqual([
      { id: 3, fecha: '2026-09-01', principal: '2 aves', detalle: 'Sin causa registrada', tieneFoto: true },
      { id: 4, fecha: '2026-09-01', principal: '1 aves', detalle: 'Sin causa registrada', tieneFoto: false },
    ])
  })

  it('calcula días del ciclo y supervivencia del lote', () => {
    const salud = calcularSaludCicloLote('2026-09-01', 1000, 15, new Date('2026-09-15T12:00:00'))
    expect(salud).toEqual({
      diasCiclo: 15,
      progresoCicloPct: 36,
      avesVivas: 985,
      supervivenciaPct: 98.5,
      tonoSupervivencia: 'ok',
    })
  })

  it('ordena la actividad reciente de todas las categorías por fecha descendente', () => {
    const recientes = crearActividadReciente(
      [pesaje(1, 10, 1200, '2026-09-02')],
      [mortalidad(2, 10, 2, '2026-09-04')],
      [sanitario(3, 10, '2026-09-01')],
      [consumo(4, 10, 25, 110, '2026-09-03')],
      3,
    )

    expect(recientes.map((evento) => evento.clave)).toEqual([
      'mortalidad-2',
      'consumo-4',
      'peso-1',
    ])
  })
})
