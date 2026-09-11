import { api } from '@shared/api/client'
import { listarTodasLasPaginas } from '@shared/api/paginacion'

export interface GalponAsignado {
  id: number
  codigo: string
  nombre: string
  activo: boolean
  granja: {
    id: number
    nombre: string
    propietario_id: number
    organizacion_id: number
  }
}

export interface AsignacionGalpon {
  id: number
  usuario_id: number
  galpon_id: number
  rol_asignacion: string | null
  fecha_asignacion: string
  activa: boolean
  galpon: GalponAsignado
}

export async function listarAsignacionesGalpon(usuarioId: number): Promise<AsignacionGalpon[]> {
  return listarTodasLasPaginas<AsignacionGalpon>(`/usuarios/${usuarioId}/galpones`)
}

export async function asignarGalpon(
  usuarioId: number,
  galponId: number,
  rolAsignacion?: string,
): Promise<AsignacionGalpon> {
  const { data } = await api.post<AsignacionGalpon>(`/usuarios/${usuarioId}/galpones`, {
    galpon_id: galponId,
    ...(rolAsignacion ? { rol_asignacion: rolAsignacion } : {}),
  })
  return data
}

export async function retirarGalpon(
  usuarioId: number,
  galponId: number,
): Promise<{ usuario_id: number; galpon_id: number; activa: boolean }> {
  const { data } = await api.delete<{ usuario_id: number; galpon_id: number; activa: boolean }>(
    `/usuarios/${usuarioId}/galpones/${galponId}`,
  )
  return data
}
