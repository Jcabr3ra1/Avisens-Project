import { api } from '@shared/api/client'
import { listarTodasLasPaginas } from '@shared/api/paginacion'
import type {
  AprobacionRecuperacion,
  RecuperacionPassword,
  ResolverRecuperacionPayload,
  SolicitarRecuperacionPayload,
} from '../model/recuperacionPassword'

export async function solicitarRecuperacion(
  payload: SolicitarRecuperacionPayload,
): Promise<{ mensaje: string }> {
  const { data } = await api.post<{ mensaje: string }>(
    '/recuperaciones-password/solicitudes',
    payload,
  )
  return data
}

export async function listarRecuperaciones(): Promise<RecuperacionPassword[]> {
  return listarTodasLasPaginas<RecuperacionPassword>('/recuperaciones-password')
}

export async function listarRecuperacionesDeUsuario(
  usuarioId: number,
): Promise<RecuperacionPassword[]> {
  const { data } = await api.get<RecuperacionPassword[]>(
    `/recuperaciones-password/usuario/${usuarioId}`,
  )
  return data
}

export async function aprobarRecuperacion(
  id: number,
  payload: ResolverRecuperacionPayload,
): Promise<AprobacionRecuperacion> {
  const { data } = await api.patch<AprobacionRecuperacion>(
    `/recuperaciones-password/${id}/aprobar`,
    payload,
  )
  return data
}

export async function rechazarRecuperacion(
  id: number,
  payload: ResolverRecuperacionPayload,
): Promise<void> {
  await api.patch(`/recuperaciones-password/${id}/rechazar`, payload)
}

export async function cambiarPasswordTemporal(
  nuevaPassword: string,
  token: string,
): Promise<{ mensaje: string }> {
  const { data } = await api.post<{ mensaje: string }>(
    '/recuperaciones-password/cambiar-password',
    { nueva_password: nuevaPassword },
    { headers: { Authorization: `Bearer ${token}` } },
  )
  return data
}
