import type { Granja } from '../api/granjas'

export interface ResumenGranjasDatos {
  total: number
  activas: number
  inactivas: number
  areaTotal: number
}

export function calcularResumenGranjas(granjas: Granja[]): ResumenGranjasDatos {
  const activas = granjas.filter((granja) => granja.activa).length
  return {
    total: granjas.length,
    activas,
    inactivas: granjas.length - activas,
    areaTotal: granjas.reduce((total, granja) => total + (granja.area_total_m2 ?? 0), 0),
  }
}
