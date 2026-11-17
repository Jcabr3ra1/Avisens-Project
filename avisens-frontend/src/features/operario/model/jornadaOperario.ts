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

export type ResumenJornada = {
  galpones: number
  lotesActivos: number
  avesEnSeguimiento: number
  galponesSinLote: number
}

// Cifras de la franja de resumen de Mi jornada, con las mismas tarjetas que
// usan las pantallas del administrador y del propietario.
export function resumirJornada(jornadas: JornadaOperario[]): ResumenJornada {
  const conLote = jornadas.filter((jornada) => jornada.lote !== null)
  return {
    galpones: jornadas.length,
    lotesActivos: conLote.length,
    avesEnSeguimiento: conLote.reduce((total, jornada) => total + (jornada.lote?.cantidad_inicial ?? 0), 0),
    galponesSinLote: jornadas.length - conLote.length,
  }
}
