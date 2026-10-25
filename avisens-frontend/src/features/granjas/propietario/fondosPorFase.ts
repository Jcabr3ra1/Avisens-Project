import fondoAmanecer from '@features/dashboard/assets/escena/fondos/fondo-amanecer-low-poly.webp'
import fondoDia from '@features/dashboard/assets/escena/fondos/fondo-dia-low-poly.webp'
import fondoTarde from '@features/dashboard/assets/escena/fondos/fondo-tarde-low-poly.webp'
import fondoNoche from '@features/dashboard/assets/escena/fondos/fondo-noche-low-poly.webp'
import type { FaseDelDia } from '@features/dashboard/model/escenaGalpon'

export const FONDOS_POR_FASE: Record<FaseDelDia, string> = {
  amanecer: fondoAmanecer,
  dia: fondoDia,
  tarde: fondoTarde,
  noche: fondoNoche,
}
