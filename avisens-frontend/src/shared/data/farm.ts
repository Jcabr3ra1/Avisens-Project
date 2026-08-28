/**
 * Forma de un galpón para los componentes visuales del dashboard
 * (CoopPlaceholder, etc.) — DashboardPage arma este objeto con datos reales
 * de useMonitoreoAmbiental; este archivo solo define la forma esperada.
 */

export type GalponStatus = 'ok' | 'warn' | 'empty'

export type Galpon = {
  id: number
  codigo: string
  nombre: string
  aves: number
  dia: number
  status: GalponStatus
  alertas: number
}
