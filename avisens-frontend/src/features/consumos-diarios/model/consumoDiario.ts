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

// Límites máximos razonables: dejan amplio margen sobre tablas de producción
// pero previenen valores astronómicos y notación científica absurda (ej. 1e+40).
export const ALIMENTO_MAXIMO_KG = 50_000
export const AGUA_MAXIMO_LITROS = 100_000

export function errorDeConsumo(form: FormularioConsumo): string {
  const tieneAlimento = form.alimento_kg.trim() !== ''
  const tieneAgua = form.agua_litros.trim() !== ''
  if (!tieneAlimento && !tieneAgua) {
    return 'Registra al menos el alimento o el agua consumida.'
  }
  if (tieneAlimento) {
    const alimento = Number(form.alimento_kg)
    if (Number.isNaN(alimento) || alimento <= 0) {
      return 'El alimento consumido debe ser mayor a 0 kg.'
    }
    if (alimento > ALIMENTO_MAXIMO_KG) {
      return `Ingrese una cantidad de alimento razonable (máximo ${ALIMENTO_MAXIMO_KG.toLocaleString('es-CO')} kg).`
    }
    if (!form.tipo_alimento_id) {
      return 'Selecciona el tipo de alimento consumido.'
    }
  }
  if (tieneAgua) {
    const agua = Number(form.agua_litros)
    if (Number.isNaN(agua) || agua <= 0) {
      return 'El agua consumida debe ser mayor a 0 litros.'
    }
    if (agua > AGUA_MAXIMO_LITROS) {
      return `Ingrese una cantidad de agua razonable (máximo ${AGUA_MAXIMO_LITROS.toLocaleString('es-CO')} L).`
    }
  }
  return ''
}
