import manana from '@features/dashboard/assets/escena/fondos/fondo-granja-manana-low-poly.webp'
import despejado from '@features/dashboard/assets/escena/fondos/fondo-granja-despejado-low-poly.webp'
import tarde from '@features/dashboard/assets/escena/fondos/fondo-granja-tarde-low-poly.webp'
import noche from '@features/dashboard/assets/escena/fondos/fondo-granja-noche-low-poly.webp'
import nublado from '@features/dashboard/assets/escena/fondos/fondo-granja-nublado-low-poly.webp'
import lluvia from '@features/dashboard/assets/escena/fondos/fondo-granja-lluvia-low-poly.webp'
import type { FaseDelDia } from '@features/dashboard/model/escenaGalpon'
import type { ClimaVisual } from './climaVisual'

const POR_HORARIO: Record<FaseDelDia, string> = { amanecer: manana, dia: despejado, tarde, noche }
const POR_CLIMA: Record<Exclude<ClimaVisual, 'despejado'>, string> = { nublado, lluvia }

export function fondoDeGranja(fase: FaseDelDia, clima: ClimaVisual): string {
  if (fase === 'noche' || clima === 'despejado') return POR_HORARIO[fase]
  return POR_CLIMA[clima]
}
