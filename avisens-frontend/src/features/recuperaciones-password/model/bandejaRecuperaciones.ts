import type { EstadoRecuperacionPassword, RecuperacionPassword } from './recuperacionPassword'

export type FiltroVistaRecuperacion = 'todos' | 'pendiente' | 'aprobada' | 'cerradas'

export interface ResumenRecuperaciones {
  pendientes: number
  aprobadas: number
  cerradas: number
  total: number
}

const ORDEN_ESTADO: Record<EstadoRecuperacionPassword, number> = {
  pendiente: 0,
  aprobada: 1,
  rechazada: 2,
  completada: 2,
}

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-CO').trim()
}

export function resumirRecuperaciones(solicitudes: RecuperacionPassword[]): ResumenRecuperaciones {
  const pendientes = solicitudes.filter((s) => s.estado === 'pendiente').length
  const aprobadas = solicitudes.filter((s) => s.estado === 'aprobada').length
  const cerradas = solicitudes.length - pendientes - aprobadas
  return { pendientes, aprobadas, cerradas, total: solicitudes.length }
}

export function filtrarRecuperaciones(
  solicitudes: RecuperacionPassword[],
  { vista, busqueda }: { vista: FiltroVistaRecuperacion; busqueda: string },
): RecuperacionPassword[] {
  const termino = normalizar(busqueda)
  return solicitudes
    .filter((solicitud) => {
      if (vista === 'todos') return true
      if (vista === 'cerradas') return solicitud.estado === 'completada' || solicitud.estado === 'rechazada'
      return solicitud.estado === vista
    })
    .filter((solicitud) => {
      if (!termino) return true
      return [
        String(solicitud.id),
        solicitud.usuario.nombre_completo,
        solicitud.usuario.username,
        solicitud.usuario.cedula,
        solicitud.usuario.email ?? '',
        solicitud.motivo ?? '',
      ].some((valor) => normalizar(valor).includes(termino))
    })
    .sort(
      (a, b) =>
        ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado]
        || new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime(),
    )
}

export function siguienteRecuperacionId(
  ids: number[],
  actualId: number | null,
  tecla: string,
): number | null {
  if (ids.length === 0) return null
  if (tecla === 'Home') return ids[0]
  if (tecla === 'End') return ids[ids.length - 1]
  if (tecla !== 'ArrowDown' && tecla !== 'ArrowUp') return null
  const indice = actualId === null ? -1 : ids.indexOf(actualId)
  if (indice === -1) return ids[0]
  const siguiente = tecla === 'ArrowDown'
    ? Math.min(indice + 1, ids.length - 1)
    : Math.max(indice - 1, 0)
  return ids[siguiente]
}
