import type {
  Lote,
  CrearLotePayload,
  ActualizarLotePayload,
  EstadoLote,
} from '../api/lotes'
import { fechaDeHoy } from '@shared/utils/fechas'

export interface FormularioLoteDatos {
  galpon_id: number
  proveedor_id: number | null
  fecha_ingreso: string
  cantidad_inicial: number | ''
  raza: string
  sexo: string
  marca_alimento: string
  costo_pollito_unitario: number | ''
  presupuesto_total_cop: number | ''
  fecha_salida_estimada: string
  fecha_salida_real: string
  estado: EstadoLote
}

function fechaInput(fecha: string | null): string {
  return fecha ? fecha.slice(0, 10) : ''
}

const fechaActual = fechaDeHoy

export function crearFormularioLote(
  galponId: number,
  proveedorId: number | null = null,
): FormularioLoteDatos {
  return {
    galpon_id: galponId,
    proveedor_id: proveedorId,
    fecha_ingreso: fechaActual(),
    cantidad_inicial: '',
    raza: '',
    sexo: '',
    marca_alimento: '',
    costo_pollito_unitario: '',
    presupuesto_total_cop: '',
    fecha_salida_estimada: '',
    fecha_salida_real: '',
    estado: 'activo',
  }
}

export function formularioDesdeLote(lote: Lote): FormularioLoteDatos {
  return {
    galpon_id: lote.galpon.id,
    proveedor_id: lote.proveedor?.id ?? null,
    fecha_ingreso: fechaInput(lote.fecha_ingreso),
    cantidad_inicial: lote.cantidad_inicial,
    raza: lote.raza ?? '',
    sexo: lote.sexo ?? '',
    marca_alimento: lote.marca_alimento ?? '',
    costo_pollito_unitario: lote.costo_pollito_unitario ?? '',
    presupuesto_total_cop: lote.presupuesto_total_cop ?? '',
    fecha_salida_estimada: fechaInput(lote.fecha_salida_estimada),
    fecha_salida_real: fechaInput(lote.fecha_salida_real),
    estado: lote.estado,
  }
}

function textoOpcional(valor: string): string | undefined {
  return valor.trim() || undefined
}

export function crearPayloadLote(form: FormularioLoteDatos): CrearLotePayload {
  return {
    galpon_id: form.galpon_id,
    ...(form.proveedor_id === null ? {} : { proveedor_id: form.proveedor_id }),
    fecha_ingreso: form.fecha_ingreso,
    cantidad_inicial: Number(form.cantidad_inicial),
    raza: textoOpcional(form.raza),
    sexo: textoOpcional(form.sexo),
    marca_alimento: textoOpcional(form.marca_alimento),
    costo_pollito_unitario: form.costo_pollito_unitario || undefined,
    presupuesto_total_cop: form.presupuesto_total_cop || undefined,
    fecha_salida_estimada: form.fecha_salida_estimada || undefined,
  }
}

export function actualizarPayloadLote(
  form: FormularioLoteDatos,
): ActualizarLotePayload {
  return {
    ...crearPayloadLote(form),
    proveedor_id: form.proveedor_id,
    fecha_salida_real: form.fecha_salida_real || undefined,
    estado: form.estado,
  }
}

// El vocabulario real de `curvas_objetivo`, que es contra lo que se compara el
// peso del lote. La búsqueda de curva usa (marca, sexo): si alguno no coincide
// no hay comparación, y el único síntoma es un 'sin_referencia' aguas abajo.
// Por eso son desplegables y no texto libre: una errata aquí apagaba el
// seguimiento del lote entero sin un solo error.
export const SEXOS_LOTE = ['macho', 'hembra', 'mixto'] as const

// El backend acepta las cuatro, pero solo italcol y solla tienen curvas
// sembradas. Se ofrecen igual —una granja que use Contegral debe poder
// registrarlo— y el formulario avisa de que esa no tendrá referencia.
export const MARCAS_ALIMENTO = ['italcol', 'solla', 'contegral', 'finca'] as const
export const MARCAS_CON_CURVA: readonly string[] = ['italcol', 'solla']

export function tieneCurvaObjetivo(marca: string): boolean {
  return MARCAS_CON_CURVA.includes(marca.trim().toLowerCase())
}
