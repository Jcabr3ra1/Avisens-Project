import { api } from '@shared/api/client'
import { listarTodasLasPaginas } from '@shared/api/paginacion'

export interface Organizacion {
  id: number
  nombre: string
  nit: string | null
  plan: string
  activa: boolean
  fecha_creacion: string
  // Lo calcula el servidor con un `_count` de Prisma sobre las relaciones, así
  // que cuenta las filas reales y no depende de lo que este usuario alcance a
  // ver en los listados de granjas y usuarios.
  _count: { granjas: number; usuarios: number }
  ultima_actividad?: string | null
}

export interface OrganizacionDetalle extends Organizacion {
  usuarios: UsuarioOrganizacionDetalle[]
  granjas: GranjaOrganizacionDetalle[]
}

export interface UsuarioOrganizacionDetalle {
  id: number
  nombre_completo: string
  email: string | null
  telefono: string | null
  activo: boolean
  fecha_creacion: string
  rol: { nombre: string }
  seguridad_cuenta: {
    bloqueado_hasta: string | null
    fecha_ultimo_login: string | null
    fecha_ultimo_cambio_password: string | null
    debe_cambiar_password: boolean
    password_temporal_expira_en: string | null
  } | null
  recuperaciones_solicitadas: Array<{
    id: number
    estado: string
    fecha_creacion: string
    atendida_en: string | null
  }>
  prospectos_convertidos: Array<{
    id: number
    nombre: string | null
    nombre_granja: string | null
    estado: string
    fecha_inicio: string
    solicitudes: Array<{
      id: number
      categoria: string
      asunto: string | null
      estado: string
      fecha_creacion: string
      fecha_cierre: string | null
    }>
  }>
  _count: { recuperaciones_solicitadas: number; prospectos_convertidos: number }
}

export interface GranjaOrganizacionDetalle {
  id: number
  nombre: string
  direccion: string | null
  municipio: string | null
  departamento: string | null
  area_total_m2: number | null
  activa: boolean
  propietario: {
    id: number
    nombre_completo: string
    email: string | null
    telefono: string | null
    activo: boolean
  }
  galpones: Array<{
    id: number
    codigo: string
    nombre: string
    activo: boolean
    _count: { dispositivo: number; sensores: number }
  }>
}

export interface CrearOrganizacionPayload {
  nombre: string
  nit?: string
  plan?: string
}

export async function listarOrganizaciones(): Promise<Organizacion[]> {
  return listarTodasLasPaginas<Organizacion>('/organizaciones')
}

export async function crearOrganizacion(
  payload: CrearOrganizacionPayload,
): Promise<Organizacion> {
  const { data } = await api.post<Organizacion>('/organizaciones', payload)
  return data
}

export type ActualizarOrganizacionPayload = Partial<CrearOrganizacionPayload> & {
  activa?: boolean
}

export async function obtenerOrganizacion(id: number): Promise<Organizacion> {
  const { data } = await api.get<Organizacion>(`/organizaciones/${id}`)
  return data
}

export async function obtenerDetalleOrganizacion(
  id: number,
): Promise<OrganizacionDetalle> {
  const { data } = await api.get<OrganizacionDetalle>(
    `/organizaciones/${id}/detalle`,
  )
  return data
}

export async function actualizarOrganizacion(
  id: number,
  payload: ActualizarOrganizacionPayload,
): Promise<Organizacion> {
  const { data } = await api.patch<Organizacion>(`/organizaciones/${id}`, payload)
  return data
}

export async function activarOrganizacion(id: number): Promise<Organizacion> {
  const { data } = await api.patch<Organizacion>(`/organizaciones/${id}/activar`)
  return data
}

// Baja lógica: conserva la organización y todo lo que cuelga de ella.
export async function desactivarOrganizacion(id: number): Promise<Organizacion> {
  const { data } = await api.delete<Organizacion>(`/organizaciones/${id}`)
  return data
}

export interface ImpactoEliminacion {
  organizacion: { id: number; nombre: string }
  usuarios: number
  granjas: number
  galpones: number
  lotes: number
  dispositivos: number
  sensores: number
  mediciones: number
  registros: number
  alertas: number
}

export async function obtenerImpactoEliminacion(id: number): Promise<ImpactoEliminacion> {
  const { data } = await api.get<ImpactoEliminacion>(`/organizaciones/${id}/impacto-eliminacion`)
  return data
}

export async function eliminarOrganizacionDefinitivo(id: number, confirmacion: string): Promise<ImpactoEliminacion> {
  const { data } = await api.delete<ImpactoEliminacion>(`/organizaciones/${id}/definitivo`, { data: { confirmacion } })
  return data
}
