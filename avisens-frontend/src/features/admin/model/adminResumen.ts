import type { Usuario } from '@shared/api'
import type { Granja } from '@features/granjas/api/granjas'
import type { Prospecto } from '@features/crm/api/prospectos'
import type { GalponMonitoreoVista } from '@features/monitoreo/hooks/useMonitoreoAmbiental'

export type KpiAdmin = {
  etiqueta: string
  valor: string | number
  detalle: string
  icono: 'granja' | 'galpon' | 'aves' | 'sensor'
}

export type EtapaCrmAdmin = {
  nombre: string
  descripcion: string
  cantidad: number
  color: string
}

export type ResumenPropietario = {
  id: number
  nombre: string
  totalGranjas: number
  granjasActivas: number
}

export function calcularKpisAdmin(granjas: Granja[], galpones: GalponMonitoreoVista[]): KpiAdmin[] {
  const sensores = galpones.flatMap((galpon) => galpon.sensores)
  const sensoresOnline = sensores.filter((sensor) => sensor.estado !== 'offline').length
  const porcentajeOnline = sensores.length > 0
    ? Math.round((sensoresOnline / sensores.length) * 1000) / 10
    : 0
  const granjasActivas = granjas.filter((granja) =>
    galpones.some((galpon) => galpon.granjaId === granja.id && galpon.loteActivo),
  ).length
  const galponesActivos = galpones.filter((galpon) => galpon.loteActivo).length
  const avesEnSistema = galpones.reduce(
    (total, galpon) => total + (galpon.loteActivo?.cantidad_inicial ?? 0),
    0,
  )

  return [
    {
      etiqueta: 'Granjas activas',
      valor: granjasActivas,
      detalle: `de ${granjas.length} granjas registradas`,
      icono: 'granja',
    },
    {
      etiqueta: 'Galpones',
      valor: galpones.length,
      detalle: `${galponesActivos} activos`,
      icono: 'galpon',
    },
    {
      etiqueta: 'Aves en sistema',
      valor: avesEnSistema.toLocaleString('es-CO'),
      detalle: 'en lotes activos',
      icono: 'aves',
    },
    {
      etiqueta: 'Sensores online',
      valor: `${sensoresOnline}/${sensores.length}`,
      detalle: `${porcentajeOnline}% en línea`,
      icono: 'sensor',
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

export function calcularResumenPropietarios(usuarios: Usuario[], granjas: Granja[]): ResumenPropietario[] {
  return usuarios
    .filter((usuario) => usuario.rol.nombre === 'Propietario')
    .map((propietario) => {
      const granjasDelPropietario = granjas.filter((granja) => granja.propietario.id === propietario.id)
      return {
        id: propietario.id,
        nombre: propietario.nombre_completo,
        totalGranjas: granjasDelPropietario.length,
        granjasActivas: granjasDelPropietario.filter((granja) => granja.activa).length,
      }
    })
    .sort((a, b) => b.totalGranjas - a.totalGranjas || a.nombre.localeCompare(b.nombre, 'es-CO'))
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
