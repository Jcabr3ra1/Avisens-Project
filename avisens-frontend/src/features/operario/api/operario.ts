import { api } from '@shared/api/client'
import { listarTodasLasPaginas } from '@shared/api/paginacion'
import type { PaginatedResponse } from '@shared/api/types'
import type { ConsumoLote, EventoSanitarioLote, MortalidadLote } from '../model/resumenLoteOperario'

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
  observaciones?: string
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

// Registros de los galpones asignados: el backend ya los acota por rol. Se
// piden todas las páginas porque los totales del lote (aves muertas) no
// pueden salir de solo las primeras 100 filas.
export function listarMortalidadOperario(): Promise<MortalidadLote[]> {
  return listarTodasLasPaginas<MortalidadLote>('/registros-mortalidad')
}

export function listarConsumosOperario(): Promise<ConsumoLote[]> {
  return listarTodasLasPaginas<ConsumoLote>('/consumos-diarios')
}

export function listarEventosSanitariosOperario(): Promise<EventoSanitarioLote[]> {
  return listarTodasLasPaginas<EventoSanitarioLote>('/eventos-sanitarios')
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
