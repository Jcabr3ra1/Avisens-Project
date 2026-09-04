import { fechaDeHoy } from '@shared/utils/fechas'
export type ConsumoDiario = {
  id: number
  lote_id: number
  tipo_alimento_id: number | null
  usuario_id: number
  fecha: string
  alimento_kg: number | null
  agua_litros: number | null
  alerta_agua_baja: boolean
  metodo_registro: string | null
  fecha_registro: string
  lote: { id: number; codigo: string }
  tipo_alimento: { id: number; nombre: string } | null
}

export type CrearConsumoDiarioPayload = {
  lote_id: number
  fecha: string
  tipo_alimento_id?: number
  alimento_kg?: number
  agua_litros?: number
  metodo_registro?: string
}

export type FormularioConsumo = {
  lote_id: string
  tipo_alimento_id: string
  fecha: string
  alimento_kg: string
  agua_litros: string
}

export const FORMULARIO_CONSUMO_INICIAL: FormularioConsumo = {
  lote_id: '', tipo_alimento_id: '', fecha: fechaDeHoy(), alimento_kg: '', agua_litros: '',
}
