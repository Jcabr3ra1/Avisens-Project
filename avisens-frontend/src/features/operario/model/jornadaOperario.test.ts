import { describe, expect, it } from 'vitest'
import type { GalponOperario, LoteOperario } from '../api/operario'
import { crearJornadasOperario, resumirJornada } from './jornadaOperario'

const galpon = (id: number, activo = true): GalponOperario => ({
  id,
  codigo: `GAL-${id}`,
  nombre: `Galpón ${id}`,
  activo,
  granja: { id: 1, nombre: 'Granja 1' },
})

const lote = (id: number, galponId: number, estado: LoteOperario['estado'] = 'activo', aves = 100): LoteOperario => ({
  id,
  codigo: `LOT-${id}`,
  fecha_ingreso: '2026-11-01',
  cantidad_inicial: aves,
  estado,
  galpon: { id: galponId, nombre: `Galpón ${galponId}` },
})

describe('crearJornadasOperario', () => {
  it('descarta galpones inactivos y toma solo el lote activo de cada galpón', () => {
    const jornadas = crearJornadasOperario(
      [galpon(1), galpon(2), galpon(3, false)],
      [lote(10, 1, 'finalizado'), lote(11, 1), lote(12, 3)],
    )
    expect(jornadas.map((jornada) => jornada.galpon.id)).toEqual([1, 2])
    expect(jornadas[0].lote?.id).toBe(11)
    expect(jornadas[1].lote).toBeNull()
  })
})

describe('resumirJornada', () => {
  it('cuenta galpones, lotes activos, aves y galpones sin lote', () => {
    const jornadas = crearJornadasOperario(
      [galpon(1), galpon(2), galpon(4)],
      [lote(11, 1, 'activo', 44), lote(12, 2, 'activo', 4)],
    )
    expect(resumirJornada(jornadas)).toEqual({
      galpones: 3,
      lotesActivos: 2,
      avesEnSeguimiento: 48,
      galponesSinLote: 1,
    })
  })

  it('sin galpones todo queda en cero', () => {
    expect(resumirJornada([])).toEqual({ galpones: 0, lotesActivos: 0, avesEnSeguimiento: 0, galponesSinLote: 0 })
  })
})
