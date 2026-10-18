import type { Organizacion } from '@features/organizaciones/api/organizaciones'
import type { Usuario } from '@shared/api'
import type { Prospecto } from '@features/crm/api/prospectos'
import { esIdentidadWhatsapp, sePuedeLlamar } from '@features/crm/model/contacto'
import {
  aProspectoVista,
  type EtapaProspecto,
  type ProspectoVista,
} from '@features/crm/model/prospectoVista'
import { resumirBandeja } from '@features/crm/model/bandeja'
import type { ConectividadPlataforma } from './conectividad'
import type { AtencionAdminData } from '../api/admin'
import { esCriticidadAlta } from '@features/alertas/model/alerta'

export type KpiAdmin = {
  etiqueta: string
  valor: string | number
  detalle: string
  icono: 'organizacion' | 'usuarios' | 'soporte' | 'sensor'
  progreso: number | null
  progresoTexto: string | null
}

export type EtapaCrmAdmin = {
  nombre: string
  descripcion: string
  cantidad: number
  color: string
}

export type TipoAtencionAdmin = 'alerta' | 'solicitud' | 'recuperacion'

export type ItemAtencionAdmin = {
  id: string
  tipo: TipoAtencionAdmin
  etiqueta: string
  titulo: string
  detalle: string
  fecha: string
  ruta: '/alertas' | '/crm' | '/usuarios'
  prioridad: number
}

export type ResumenAtencionAdmin = {
  items: ItemAtencionAdmin[]
  alertasCriticas: number
  solicitudesPendientes: number
  recuperacionesPendientes: number
}

export function calcularAtencionAdmin(datos: AtencionAdminData): ResumenAtencionAdmin {
  const alertasPendientes = datos.alertas.filter((alerta) => alerta.estado !== 'cerrada')
  const solicitudesPendientes = datos.solicitudes.filter(
    (solicitud) => solicitud.estado === 'abierta' || solicitud.estado === 'en_proceso',
  )
  const recuperacionesPendientes = datos.recuperaciones.filter(
    (recuperacion) => recuperacion.estado === 'pendiente',
  )

  const items: ItemAtencionAdmin[] = [
    ...alertasPendientes.map((alerta) => ({
      id: `alerta-${alerta.id}`,
      tipo: 'alerta' as const,
      etiqueta: esCriticidadAlta(alerta.criticidad) ? 'Alerta crítica' : 'Alerta',
      titulo: alerta.mensaje ?? `${alerta.tipo} fuera de rango`,
      detalle: `${alerta.galpon.granja.nombre} · ${alerta.galpon.nombre}`,
      fecha: alerta.fecha_creacion,
      ruta: '/alertas' as const,
      prioridad: esCriticidadAlta(alerta.criticidad) ? 3 : 2,
    })),
    ...solicitudesPendientes.map((solicitud) => ({
      id: `solicitud-${solicitud.id}`,
      tipo: 'solicitud' as const,
      etiqueta: solicitud.estado === 'abierta' ? 'PQRS pendiente' : 'PQRS en atención',
      titulo: solicitud.asunto ?? solicitud.categoria,
      detalle: solicitud.prospecto.nombre ?? solicitud.prospecto.email ?? 'Sin contacto asociado',
      fecha: solicitud.fecha_creacion,
      ruta: '/crm' as const,
      prioridad: solicitud.estado === 'abierta' ? 2 : 1,
    })),
    ...recuperacionesPendientes.map((recuperacion) => ({
      id: `recuperacion-${recuperacion.id}`,
      tipo: 'recuperacion' as const,
      etiqueta: 'Acceso pendiente',
      titulo: `Recuperar acceso de ${recuperacion.usuario.nombre_completo}`,
      detalle: recuperacion.usuario.username,
      fecha: recuperacion.fecha_creacion,
      ruta: '/usuarios' as const,
      prioridad: 2,
    })),
  ]

  items.sort((a, b) => b.prioridad - a.prioridad || new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

  return {
    items: items.slice(0, 6),
    alertasCriticas: alertasPendientes.filter((alerta) => esCriticidadAlta(alerta.criticidad)).length,
    solicitudesPendientes: solicitudesPendientes.length,
    recuperacionesPendientes: recuperacionesPendientes.length,
  }
}

function kpiConectividad(conectividad: ConectividadPlataforma | null, error: boolean): KpiAdmin {
  const base = { etiqueta: 'Controladores en línea', icono: 'sensor' as const }
  if (error) return { ...base, valor: '—', detalle: 'No se pudo consultar los controladores', progreso: null, progresoTexto: null }
  if (!conectividad || conectividad.total === 0) return { ...base, valor: '—', detalle: 'Sin controladores instalados', progreso: null, progresoTexto: null }
  const { conectados, total, ventana_minutos: ventana } = conectividad
  const caidos = total - conectados
  return {
    ...base,
    valor: `${conectados}/${total}`,
    detalle: caidos === 0 ? `Todos reportan (últimos ${ventana} min)` : `${caidos} sin reportar en ${ventana} min`,
    progreso: Math.round((conectados / total) * 1000) / 10,
    progresoTexto: `${conectados} de ${total} controladores reportando`,
  }
}

export function calcularKpisAdmin(
  organizaciones: Organizacion[],
  usuarios: Usuario[],
  atencion: ResumenAtencionAdmin,
  conectividad: ConectividadPlataforma | null,
  errorConectividad = false,
): KpiAdmin[] {
  const organizacionesActivas = organizaciones.filter((item) => item.activa).length
  const usuariosActivos = usuarios.filter((usuario) => usuario.activo).length
  const enCola = atencion.solicitudesPendientes + atencion.recuperacionesPendientes

  // El administrador opera la plataforma, así que su portada abre con sus
  // clientes y su cola de trabajo. Las granjas, los galpones y las aves no
  // desaparecen: viven en su propia sección, que es donde se supervisan.
  // Los sensores sí se quedan aquí porque son infraestructura instalada por
  // la plataforma y su caída es un problema suyo, no del propietario.
  return [
    {
      etiqueta: 'Organizaciones activas',
      valor: organizacionesActivas,
      detalle: `de ${organizaciones.length} clientes registrados`,
      icono: 'organizacion',
      progreso: organizaciones.length > 0 ? Math.round((organizacionesActivas / organizaciones.length) * 100) : null,
      progresoTexto: organizaciones.length > 0 ? `${organizacionesActivas} de ${organizaciones.length} activas` : null,
    },
    {
      etiqueta: 'Personas',
      valor: usuarios.length,
      detalle: `${usuariosActivos} con acceso`,
      icono: 'usuarios',
      progreso: usuarios.length > 0 ? Math.round((usuariosActivos / usuarios.length) * 100) : null,
      progresoTexto: usuarios.length > 0 ? `${usuariosActivos} de ${usuarios.length} con acceso` : null,
    },
    {
      etiqueta: 'En espera de respuesta',
      valor: enCola,
      detalle: `${atencion.solicitudesPendientes} PQRS · ${atencion.recuperacionesPendientes} contraseñas`,
      icono: 'soporte',
      progreso: null,
      progresoTexto: null,
    },
    kpiConectividad(conectividad, errorConectividad),
  ]
}


export function calcularEtapasCrmAdmin(prospectos: Prospecto[]): EtapaCrmAdmin[] {
  const resumen = resumirBandeja(prospectos.map(aProspectoVista))
  return [
    { nombre: 'Fríos', descripcion: 'Primer contacto', cantidad: resumen.porTemperatura.frio, color: 'var(--info)' },
    { nombre: 'Tibios', descripcion: 'Demo o propuesta', cantidad: resumen.porTemperatura.tibio, color: 'var(--warning)' },
    { nombre: 'Calientes', descripcion: 'Visita programada', cantidad: resumen.porTemperatura.caliente, color: 'var(--danger)' },
    { nombre: 'Cerrados', descripcion: 'Contrato firmado', cantidad: resumen.convertidos, color: 'var(--success)' },
  ]
}

export function calcularConversionCrm(prospectos: Prospecto[]): number {
  return resumirBandeja(prospectos.map(aProspectoVista)).conversionPct
}

export type ProspectoReciente = {
  id: number
  nombre: string
  contacto: string
  fechaRegistro: string
  etapa: EtapaProspecto
  canal: string
}

const CANAL_LEGIBLE: Record<ProspectoVista['canal'], string> = {
  whatsapp: 'WhatsApp',
  web: 'Web',
  otro: 'Otro canal',
}

// Contacto útil para el administrador: el teléfono si se puede marcar, si no
// el correo. Una identidad de WhatsApp (p. ej. "CO.123") no es un número.
function contactoDe(prospecto: Prospecto): string {
  if (sePuedeLlamar(prospecto.telefono)) return prospecto.telefono!.trim()
  if (prospecto.email) return prospecto.email
  if (esIdentidadWhatsapp(prospecto.telefono)) return 'Usuario de WhatsApp'
  return 'Sin contacto'
}

// Los prospectos más recientes captados por el chatbot (por fecha de inicio
// de la conversación), con lo que el administrador necesita para ubicarlos.
export function ultimosProspectos(prospectos: Prospecto[], limite = 5): ProspectoReciente[] {
  return [...prospectos]
    .sort((a, b) => new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime())
    .slice(0, limite)
    .map((prospecto) => {
      const vista = aProspectoVista(prospecto)
      return {
        id: prospecto.id,
        nombre: vista.nombre,
        contacto: contactoDe(prospecto),
        fechaRegistro: prospecto.fecha_inicio,
        etapa: vista.etapa,
        canal: CANAL_LEGIBLE[vista.canal],
      }
    })
}

export { hace } from '@shared/utils/fechas'
