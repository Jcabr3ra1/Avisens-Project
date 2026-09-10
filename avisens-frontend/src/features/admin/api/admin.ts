import { type Usuario } from '@shared/api'
import { listarUsuarios } from '@features/usuarios/api/usuarios'
import { listarProspectos, type Prospecto } from '@features/crm/api/prospectos'
import { listarGranjas, type Granja } from '@features/granjas/api/granjas'
import { listarAlertas, type Alerta } from '@features/alertas/api/alertas'
import { listarSolicitudesPqrs } from '@features/solicitudes-pqrs/api/solicitudesPqrs'
import type { SolicitudPqrs } from '@features/solicitudes-pqrs/model/solicitudPqrs'
import { listarRecuperaciones } from '@features/recuperaciones-password/api/recuperacionesPassword'
import type { RecuperacionPassword } from '@features/recuperaciones-password/model/recuperacionPassword'

export function cargarGestionAdmin(): Promise<[Usuario[], Granja[]]> {
  return Promise.all([listarUsuarios(), listarGranjas()])
}

export function cargarProspectosAdmin(): Promise<{ data: Prospecto[] }> {
  return listarProspectos()
}

export type AtencionAdminData = {
  alertas: Alerta[]
  solicitudes: SolicitudPqrs[]
  recuperaciones: RecuperacionPassword[]
}

export async function cargarAtencionAdmin(): Promise<AtencionAdminData> {
  const [alertas, solicitudes, recuperaciones] = await Promise.all([
    listarAlertas(),
    listarSolicitudesPqrs({ page: 1, limit: 100 }),
    listarRecuperaciones(),
  ])

  return { alertas, solicitudes: solicitudes.data, recuperaciones }
}
