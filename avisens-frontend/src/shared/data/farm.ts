/**
 * Datos de dominio compartidos: granjas y galpones.
 *
 * Viven en `shared/` porque varios módulos los necesitan (dashboard, sidebar
 * del layout, y a futuro granjas/monitoreo). Hoy son mock; cuando exista
 * backend, esto se reemplaza por un servicio en `shared/services/`.
 */

export type GalponStatus = 'ok' | 'warn' | 'empty'

export type Granja = {
  id: number
  nombre: string
  municipio: string
  galpones: number
}

export type Galpon = {
  id: number
  codigo: string
  nombre: string
  aves: number
  dia: number
  status: GalponStatus
  alertas: number
}

export const GRANJAS: Granja[] = [
  { id: 1, nombre: 'Granja Las Palmas', municipio: 'Popayán, Cauca', galpones: 4 },
  { id: 2, nombre: 'Granja El Cedro',   municipio: 'Cajibío, Cauca', galpones: 2 },
  { id: 3, nombre: 'Granja San José',   municipio: 'Timbío, Cauca',  galpones: 3 },
]

export const GALPONES: Galpon[] = [
  { id: 1, codigo: 'GP-01', nombre: 'Galpón Norte', aves: 18560, dia: 32, status: 'ok',    alertas: 2 },
  { id: 2, codigo: 'GP-02', nombre: 'Galpón Sur',   aves: 17200, dia: 18, status: 'ok',    alertas: 0 },
  { id: 3, codigo: 'GP-03', nombre: 'Galpón Este',  aves: 19800, dia: 41, status: 'warn',  alertas: 1 },
  { id: 4, codigo: 'GP-04', nombre: 'Galpón Oeste', aves: 0,     dia: 0,  status: 'empty', alertas: 0 },
]
