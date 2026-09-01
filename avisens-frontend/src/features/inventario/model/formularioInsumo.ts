import type { ActualizarInsumoPayload, CrearInsumoPayload, Insumo } from '../api/insumos'

export interface FormularioInsumoDatos {
  nombre: string
  tipo: string
  unidad_medida: string
  stock_actual: string
  stock_minimo: string
  precio_unitario_cop: string
  ubicacion_almacen: string
  fecha_vencimiento: string
}

export function crearFormularioInsumo(): FormularioInsumoDatos {
  return {
    nombre: '',
    tipo: '',
    unidad_medida: '',
    stock_actual: '0',
    stock_minimo: '0',
    precio_unitario_cop: '',
    ubicacion_almacen: '',
    fecha_vencimiento: '',
  }
}

export function formularioDesdeInsumo(insumo: Insumo): FormularioInsumoDatos {
  return {
    nombre: insumo.nombre,
    tipo: insumo.tipo ?? '',
    unidad_medida: insumo.unidad_medida,
    stock_actual: String(insumo.stock_actual),
    stock_minimo: String(insumo.stock_minimo),
    precio_unitario_cop:
      insumo.precio_unitario_cop === null ? '' : String(insumo.precio_unitario_cop),
    ubicacion_almacen: insumo.ubicacion_almacen ?? '',
    fecha_vencimiento: insumo.fecha_vencimiento?.slice(0, 10) ?? '',
  }
}

function textoOpcional(valor: string): string | undefined {
  const limpio = valor.trim()
  return limpio === '' ? undefined : limpio
}

function numeroOpcional(valor: string): number | undefined {
  const limpio = valor.trim()
  if (limpio === '') return undefined
  const numero = Number(limpio)
  return Number.isFinite(numero) ? numero : undefined
}

export function crearPayloadInsumo(form: FormularioInsumoDatos): CrearInsumoPayload {
  return {
    nombre: form.nombre.trim(),
    unidad_medida: form.unidad_medida.trim(),
    tipo: textoOpcional(form.tipo),
    stock_actual: numeroOpcional(form.stock_actual),
    stock_minimo: numeroOpcional(form.stock_minimo),
    precio_unitario_cop: numeroOpcional(form.precio_unitario_cop),
    ubicacion_almacen: textoOpcional(form.ubicacion_almacen),
    fecha_vencimiento: textoOpcional(form.fecha_vencimiento),
  }
}

// Al editar no se toca el stock: eso solo cambia con un movimiento, que deja
// rastro. Permitirlo aquí abriría un camino para alterar la bodega sin
// registro y rompería la auditoría.
export function actualizarPayloadInsumo(form: FormularioInsumoDatos): ActualizarInsumoPayload {
  const payload = crearPayloadInsumo(form)
  delete (payload as Partial<CrearInsumoPayload>).stock_actual
  return payload
}
