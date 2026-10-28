import fondoAmanecer from '../../assets/escena/fondos/fondo-amanecer-low-poly.webp'
import fondoDia from '../../assets/escena/fondos/fondo-dia-low-poly.webp'
import fondoTarde from '../../assets/escena/fondos/fondo-tarde-low-poly.webp'
import fondoNoche from '../../assets/escena/fondos/fondo-noche-low-poly.webp'
import type { FaseDelDia } from '../../model/escenaGalpon'

export const FONDOS_POR_FASE: Record<FaseDelDia, string> = {
  amanecer: fondoAmanecer,
  dia: fondoDia,
  tarde: fondoTarde,
  noche: fondoNoche,
}
