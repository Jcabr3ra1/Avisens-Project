import { type Usuario } from '@shared/api'
import { listarUsuarios } from '@features/usuarios/api/usuarios'
import { listarTodosLosProspectos, type Prospecto } from '@features/crm/api/prospectos'
import { listarGranjas, type Granja } from '@features/granjas/api/granjas'
import { listarOrganizaciones, type Organizacion } from '@features/organizaciones/api/organizaciones'
import { listarAlertas, type Alerta } from '@features/alertas/api/alertas'
import { listarTodasLasSolicitudesPqrs } from '@features/solicitudes-pqrs/api/solicitudesPqrs'
import type { SolicitudPqrs } from '@features/solicitudes-pqrs/model/solicitudPqrs'
import { listarRecuperaciones } from '@features/recuperaciones-password/api/recuperacionesPassword'
import type { RecuperacionPassword } from '@features/recuperaciones-password/model/recuperacionPassword'

export function cargarGestionAdmin(): Promise<[Usuario[], Granja[], Organizacion[]]> {
  return Promise.all([listarUsuarios(), listarGranjas(), listarOrganizaciones()])
}

export function cargarProspectosAdmin(): Promise<Prospecto[]> {
  return listarTodosLosProspectos()
}

export type AtencionAdminData = {
  alertas: Alerta[]
  solicitudes: SolicitudPqrs[]
  recuperaciones: RecuperacionPassword[]
}

export async function cargarAtencionAdmin(): Promise<AtencionAdminData> {
  const [alertas, solicitudes, recuperaciones] = await Promise.all([
    listarAlertas(),
    listarTodasLasSolicitudesPqrs(),
    listarRecuperaciones(),
  ])

  return { alertas, solicitudes, recuperaciones }
}
