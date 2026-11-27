import { diasDeVida } from '@shared/utils/fechas'
import type { GalponOperario, LoteOperario } from '../api/operario'

export type JornadaOperario = {
  galpon: GalponOperario
  lote: LoteOperario | null
  lotesActivos: LoteOperario[]
  diaLote: number | null
}

// Antes contaba desde 1 y restaba milisegundos: el mismo lote salía con un
// día distinto al de Monitoreo y el contador avanzaba a las 7 p.m.
const calcularDiaLote = diasDeVida

export function crearJornadasOperario(
  galpones: GalponOperario[],
  lotes: LoteOperario[],
): JornadaOperario[] {
  return galpones
    .filter((galpon) => galpon.activo)
    .map((galpon) => {
      const lotesActivos = lotes
        .filter((item) => item.galpon.id === galpon.id && item.estado === 'activo')
        .sort((a, b) => new Date(b.fecha_ingreso).getTime() - new Date(a.fecha_ingreso).getTime())
      const lote = lotesActivos[0] ?? null
      return {
        galpon,
        lote,
        lotesActivos,
        diaLote: lote ? calcularDiaLote(lote.fecha_ingreso) : null,
      }
    })
}
