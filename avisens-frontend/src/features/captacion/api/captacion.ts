import { api } from '@shared/api/client'
import type { FormularioProspectoWeb } from '../model/prospectoWeb'

export type ProspectoCaptado = {
  id: number
  nombre: string | null
  canal_origen: string | null
  estado: string
}

export async function crearProspectoWeb(
  formulario: FormularioProspectoWeb,
): Promise<ProspectoCaptado> {
  const { data } = await api.post<ProspectoCaptado>('/captacion-prospectos/web', formulario)
  return data
}
