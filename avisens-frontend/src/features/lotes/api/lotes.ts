import { api } from '@shared/api/client'
import { listarTodasLasPaginas } from '@shared/api/paginacion'

export type EstadoLote = 'activo' | 'finalizado' | 'inactivo'

export interface Lote {
  id: number
  codigo: string
  fecha_ingreso: string
  cantidad_inicial: number
  raza: string | null
  sexo: string | null
  marca_alimento: string | null
  linea_genetica: { id: number; codigo: string; nombre: string } | null
  costo_pollito_unitario: number | null
  presupuesto_total_cop: number | null
  fecha_salida_estimada: string | null
  fecha_salida_real: string | null
  cantidad_aves_vendidas?: number | null
  peso_promedio_final_g?: number | null
  valor_venta_total_cop?: number | null
  precio_venta_kg_cop?: number | null
  mortalidad_acumulada_final_pct?: number | null
  fcr_final?: number | null
  cerrado_por_id?: number | null
  fecha_cierre?: string | null
  estado: EstadoLote
  galpon: {
    id: number
    nombre: string
    granja: { id: number; nombre: string; propietario_id: number }
  }
}

export interface CrearLotePayload {
  galpon_id: number
  linea_genetica_id?: number | null
  fecha_ingreso: string
  cantidad_inicial: number
  raza?: string
  sexo?: string
  marca_alimento?: string
  costo_pollito_unitario?: number
  presupuesto_total_cop?: number
  fecha_salida_estimada?: string
}

export type ActualizarLotePayload = Partial<CrearLotePayload> & {
  fecha_salida_real?: string
  estado?: EstadoLote
}

export async function listarLotes(): Promise<Lote[]> {
  return listarTodasLasPaginas<Lote>('/lotes')
}

export async function obtenerLote(id: number): Promise<Lote> {
  const { data } = await api.get<Lote>(`/lotes/${id}`)
  return data
}

export async function crearLote(payload: CrearLotePayload): Promise<Lote> {
  const { data } = await api.post<Lote>('/lotes', payload)
  return data
}

export async function actualizarLote(
  id: number,
  payload: ActualizarLotePayload,
): Promise<Lote> {
  const { data } = await api.patch<Lote>(`/lotes/${id}`, payload)
  return data
}

export async function activarLote(id: number): Promise<Lote> {
  const { data } = await api.patch<Lote>(`/lotes/${id}/activar`)
  return data
}

export async function desactivarLote(id: number): Promise<Lote> {
  const { data } = await api.delete<Lote>(`/lotes/${id}`)
  return data
}

export async function eliminarLotePermanente(
  id: number,
): Promise<{ id: number; eliminado: boolean }> {
  const { data } = await api.delete<{ id: number; eliminado: boolean }>(
    `/lotes/${id}/permanente`,
  )
  return data
}

export type DatosLotePayload = {
  linea_genetica_id: number
  sexo: string
  marca_alimento: string
}

export async function actualizarDatosLote(id: number, payload: DatosLotePayload): Promise<Lote> {
  const { data } = await api.patch<Lote>(`/lotes/${id}/datos`, payload)
  return data
}

export interface CerrarLotePayload {
  fecha_salida_real: string
  cantidad_aves_vendidas: number
  peso_promedio_final_g: number
  valor_venta_total_cop?: number
  precio_venta_kg_cop?: number
  confirmar_cierre?: boolean
}

export interface DiaFaltanteCierre {
  dia: number
  fecha: string
}

export type ResultadoCierreLote =
  | {
      cerrado: false
      requiere_confirmacion: true
      mensaje: string
      dias_sin_alimento: DiaFaltanteCierre[]
      dias_sin_mortalidad: DiaFaltanteCierre[]
    }
  | {
      cerrado: true
      requiere_confirmacion: false
      lote: Lote
      movimiento_financiero: unknown
      resumen_cierre: {
        duracion_dias: number
        muertes_totales: number
        mortalidad_acumulada_final_pct: number
        alimento_total_kg: number
        peso_total_vendido_kg: number
        fcr_final: number | null
        precio_venta_kg_cop: number | null
      }
    }

export async function cerrarLote(
  id: number,
  payload: CerrarLotePayload,
): Promise<ResultadoCierreLote> {
  const { data } = await api.patch<ResultadoCierreLote>(`/lotes/${id}/cerrar`, payload)
  return data
}
