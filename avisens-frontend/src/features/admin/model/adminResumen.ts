import type { Organizacion } from '@features/organizaciones/api/organizaciones'
import type { Usuario } from '@shared/api'
import type { Prospecto } from '@features/crm/api/prospectos'
import type { GalponMonitoreoVista } from '@features/monitoreo/hooks/useMonitoreoAmbiental'
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
      detalle: recuperacion.usuario.email,
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

export function calcularKpisAdmin(
  organizaciones: Organizacion[],
  usuarios: Usuario[],
  atencion: ResumenAtencionAdmin,
  galpones: GalponMonitoreoVista[],
): KpiAdmin[] {
  const sensores = galpones.flatMap((galpon) => galpon.sensores)
  const sensoresOnline = sensores.filter((sensor) => sensor.estado !== 'offline').length
  const porcentajeOnline = sensores.length > 0
    ? Math.round((sensoresOnline / sensores.length) * 1000) / 10
    : null

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
      etiqueta: 'Usuarios',
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
    {
      etiqueta: 'Sensores en línea',
      valor: sensores.length > 0 ? `${sensoresOnline}/${sensores.length}` : '—',
      detalle: porcentajeOnline === null ? 'Sin sensores instalados' : `${porcentajeOnline}% en línea`,
      icono: 'sensor',
      progreso: porcentajeOnline,
      progresoTexto: sensores.length > 0 ? `${sensoresOnline} de ${sensores.length} sensores en línea` : null,
    },
  ]
}


export function calcularEtapasCrmAdmin(prospectos: Prospecto[]): EtapaCrmAdmin[] {
  const cantidadPorClasificacion = (clasificacion: string) =>
    prospectos.filter((prospecto) => prospecto.clasificacion === clasificacion).length

  return [
    { nombre: 'Fríos', descripcion: 'Primer contacto', cantidad: cantidadPorClasificacion('frio'), color: '#3b82f6' },
    { nombre: 'Tibios', descripcion: 'Demo o propuesta', cantidad: cantidadPorClasificacion('tibio'), color: '#f59e0b' },
    { nombre: 'Calientes', descripcion: 'Visita programada', cantidad: cantidadPorClasificacion('caliente'), color: '#ef4444' },
    { nombre: 'Cerrados', descripcion: 'Contrato firmado', cantidad: prospectos.filter((prospecto) => prospecto.estado === 'cerrado').length, color: '#10b981' },
  ]
}

export function calcularConversionCrm(prospectos: Prospecto[], etapas: EtapaCrmAdmin[]): number {
  const calificados = prospectos.filter((prospecto) =>
    ['frio', 'tibio', 'caliente'].includes(prospecto.clasificacion ?? ''),
  ).length
  const cerrados = etapas.find((etapa) => etapa.nombre === 'Cerrados')?.cantidad ?? 0
  return calificados > 0 ? Math.round((cerrados / calificados) * 1000) / 10 : 0
}

export function hace(fechaIso: string): string {
  const minutos = Math.floor((Date.now() - new Date(fechaIso).getTime()) / 60_000)
  if (minutos < 1) return 'justo ahora'
  if (minutos < 60) return `hace ${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `hace ${horas} h`
  const dias = Math.floor(horas / 24)
  return dias === 1 ? 'ayer' : `hace ${dias} días`
}
