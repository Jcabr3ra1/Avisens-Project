import { api } from '@shared/api/client'
import type { PaginatedResponse } from '@shared/api/types'

export interface GalponOperario {
  id: number
  codigo: string
  nombre: string
  activo: boolean
  granja: {
    id: number
    nombre: string
  }
}

export interface LoteOperario {
  id: number
  codigo: string
  fecha_ingreso: string
  cantidad_inicial: number
  estado: 'activo' | 'finalizado' | 'inactivo'
  galpon: {
    id: number
    nombre: string
  }
}

export type RegistroMortalidadOperario = {
  fecha: string
  cantidad_aves: number
  causa_presuntiva?: string
  disposicion?: string
}

export type RegistroConsumoOperario = {
  fecha: string
  alimento_kg?: number
  agua_litros?: number
}

export async function listarGalponesOperario(): Promise<GalponOperario[]> {
  const { data } = await api.get<PaginatedResponse<GalponOperario>>('/galpones', {
    params: { page: 1, limit: 100 },
  })
  return data.data
}

export async function listarLotesOperario(): Promise<LoteOperario[]> {
  const { data } = await api.get<PaginatedResponse<LoteOperario>>('/lotes', {
    params: { page: 1, limit: 100 },
  })
  return data.data
}

export async function registrarMortalidadOperario(
  loteId: number,
  registro: RegistroMortalidadOperario,
): Promise<void> {
  await api.post('/registros-mortalidad', {
    lote_id: loteId,
    ...registro,
    metodo_registro: 'manual',
  })
}

export async function registrarConsumoOperario(
  loteId: number,
  registro: RegistroConsumoOperario,
): Promise<void> {
  await api.post('/consumos-diarios', {
    lote_id: loteId,
    ...registro,
    metodo_registro: 'manual',
  })
}
