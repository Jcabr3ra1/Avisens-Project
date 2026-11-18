import { diasDeVida } from '@shared/utils/fechas'
import type { GalponOperario, LoteOperario } from '../api/operario'

export type JornadaOperario = {
  galpon: GalponOperario
  lote: LoteOperario | null
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
      const lote = lotes.find((item) => item.galpon.id === galpon.id && item.estado === 'activo') ?? null
      return {
        galpon,
        lote,
        diaLote: lote ? calcularDiaLote(lote.fecha_ingreso) : null,
      }
    })
}
