import type { Galpon } from '../api/galpones'

export type FiltroEstadoGalpon = 'todos' | 'activos' | 'inactivos'

export interface ResumenGalponesDatos {
  total: number
  activos: number
  inactivos: number
  capacidad: number
}

export function calcularResumenGalpones(galpones: Galpon[]): ResumenGalponesDatos {
  return {
    total: galpones.length,
    activos: galpones.filter((galpon) => galpon.activo).length,
    inactivos: galpones.filter((galpon) => !galpon.activo).length,
    capacidad: galpones.reduce((total, galpon) => total + (galpon.capacidad_aves ?? 0), 0),
  }
}

export function filtrarGalpones(
  galpones: Galpon[],
  busqueda: string,
  estado: FiltroEstadoGalpon,
): Galpon[] {
  const termino = busqueda.trim().toLowerCase()
  return galpones.filter((galpon) => {
    const coincideEstado =
      estado === 'todos' ||
      (estado === 'activos' && galpon.activo) ||
      (estado === 'inactivos' && !galpon.activo)
    const coincideBusqueda =
      !termino ||
      galpon.codigo.toLowerCase().includes(termino) ||
      galpon.nombre.toLowerCase().includes(termino) ||
      galpon.granja.nombre.toLowerCase().includes(termino)
    return coincideEstado && coincideBusqueda
  })
}
