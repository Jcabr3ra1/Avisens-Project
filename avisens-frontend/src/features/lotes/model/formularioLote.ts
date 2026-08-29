import type {
  Lote,
  CrearLotePayload,
  ActualizarLotePayload,
  EstadoLote,
} from '../api/lotes'

export interface FormularioLoteDatos {
  galpon_id: number
  proveedor_id: number
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

function fechaActual(): string {
  const hoy = new Date()
  const desplazamiento = hoy.getTimezoneOffset() * 60_000
  return new Date(hoy.getTime() - desplazamiento).toISOString().slice(0, 10)
}

export function crearFormularioLote(
  galponId: number,
  proveedorId: number,
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
    proveedor_id: lote.proveedor.id,
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
    proveedor_id: form.proveedor_id,
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
    fecha_salida_real: form.fecha_salida_real || undefined,
    estado: form.estado,
  }
}
