import type { GalponOperario, LoteOperario } from '../api/operario'

export type JornadaOperario = {
  galpon: GalponOperario
  lote: LoteOperario | null
  diaLote: number | null
}

function calcularDiaLote(fechaIngreso: string): number {
  const ingreso = new Date(fechaIngreso)
  const hoy = new Date()
  const diferencia = hoy.getTime() - ingreso.getTime()
  return Math.max(1, Math.floor(diferencia / 86_400_000) + 1)
}

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
