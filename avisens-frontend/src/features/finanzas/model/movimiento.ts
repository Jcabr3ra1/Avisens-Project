import type {
  CategoriaFinanciera,
  CrearMovimientoFinancieroPayload,
  MovimientoFinanciero,
} from '../api/movimientos-financieros'

export type TipoMovimiento = 'ingreso' | 'egreso'

export interface FormularioMovimiento {
  tipo: TipoMovimiento
  categoria_id: string
  valor_cop: string
  fecha: string
  granja_id: string
  lote_id: string
  descripcion: string
  numero_factura: string
  metodo_pago: string
}

export const METODOS_PAGO = ['efectivo', 'transferencia', 'credito', 'cheque'] as const

export function formularioVacio(fechaDeHoy: string): FormularioMovimiento {
  return {
    tipo: 'egreso',
    categoria_id: '',
    valor_cop: '',
    fecha: fechaDeHoy,
    granja_id: '',
    lote_id: '',
    descripcion: '',
    numero_factura: '',
    metodo_pago: '',
  }
}

export function formularioDesde(movimiento: MovimientoFinanciero): FormularioMovimiento {
  return {
    tipo: movimiento.tipo === 'ingreso' ? 'ingreso' : 'egreso',
    categoria_id: String(movimiento.categoria_id),
    valor_cop: String(movimiento.valor_cop),
    // La fecha llega como ISO y el input date solo entiende YYYY-MM-DD.
    fecha: movimiento.fecha.slice(0, 10),
    granja_id: String(movimiento.granja_id),
    lote_id: movimiento.lote_id === null ? '' : String(movimiento.lote_id),
    descripcion: movimiento.descripcion ?? '',
    numero_factura: movimiento.numero_factura ?? '',
    metodo_pago: movimiento.metodo_pago ?? '',
  }
}

// Los campos opcionales se omiten en vez de mandarse vacíos: el backend los
// valida como número o cadena con formato, y un '' se rechaza con un 400 que
// desde la pantalla no se entiende.
export function payloadDesdeFormulario(
  form: FormularioMovimiento,
): CrearMovimientoFinancieroPayload {
  const payload: CrearMovimientoFinancieroPayload = {
    categoria_id: Number(form.categoria_id),
    tipo: form.tipo,
    valor_cop: Number(form.valor_cop),
    fecha: form.fecha,
  }
  if (form.granja_id) payload.granja_id = Number(form.granja_id)
  if (form.lote_id) payload.lote_id = Number(form.lote_id)
  if (form.descripcion.trim()) payload.descripcion = form.descripcion.trim()
  if (form.numero_factura.trim()) payload.numero_factura = form.numero_factura.trim()
  if (form.metodo_pago) payload.metodo_pago = form.metodo_pago
  return payload
}

// Mismo tope que el backend (VALOR_MAXIMO_MOVIMIENTO_COP): se avisa antes de
// enviar, en vez de dejar que la base rechace el monto.
export const VALOR_MAXIMO_COP = 10_000_000_000

export function errorDeFormulario(form: FormularioMovimiento): string {
  if (!form.categoria_id) return 'Elige una categoría.'
  if (!form.granja_id) return 'Elige la granja del movimiento.'
  const valor = Number(form.valor_cop)
  if (!form.valor_cop || Number.isNaN(valor)) return 'Escribe el monto en pesos.'
  if (valor <= 0) return 'El monto debe ser mayor que cero.'
  if (valor > VALOR_MAXIMO_COP) {
    return 'Ingrese un monto razonable: el máximo por movimiento es $10.000.000.000. Revisa si sobran dígitos.'
  }
  if (!form.fecha) return 'Elige la fecha del movimiento.'
  return ''
}

// Una categoría marcada como 'ingreso' no debe ofrecerse al registrar un egreso:
// el backend rechazaría la combinación y el usuario vería un 400 sin contexto.
// Las que no declaran tipo sirven para ambos.
export function categoriasParaTipo(
  categorias: CategoriaFinanciera[],
  tipo: TipoMovimiento,
): CategoriaFinanciera[] {
  return categorias.filter(
    (categoria) => categoria.tipo === null || categoria.tipo === tipo,
  )
}

// La fecha del movimiento es un día de calendario (columna DATE): llega como
// '2026-10-16T00:00:00.000Z'. Formatearla con la zona local la corría al día
// anterior en Colombia (UTC-5), y el listado mostraba el 15 mientras el
// formulario de edición mostraba el 16 (QA-03). Se formatea en UTC para que
// listado y edición digan el mismo día.
export function fechaCorta(fecha: string): string {
  const dia = fecha.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return '—'
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${dia}T00:00:00.000Z`))
}
