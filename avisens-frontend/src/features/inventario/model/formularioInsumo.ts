import type { ActualizarInsumoPayload, CrearInsumoPayload, Insumo } from '../api/insumos'

export interface FormularioInsumoDatos {
  granja_id: number
  nombre: string
  tipo: string
  unidad_medida: string
  stock_actual: string
  stock_minimo: string
  precio_unitario_cop: string
  ubicacion_almacen: string
  fecha_vencimiento: string
  // 0 = sin proveedor. El select trabaja con números y 0 nunca es un id.
  proveedor_habitual_id: number
}

export function crearFormularioInsumo(granjaId = 0): FormularioInsumoDatos {
  return {
    granja_id: granjaId,
    nombre: '',
    tipo: '',
    unidad_medida: '',
    stock_actual: '0',
    stock_minimo: '0',
    precio_unitario_cop: '',
    ubicacion_almacen: '',
    fecha_vencimiento: '',
    proveedor_habitual_id: 0,
  }
}

export function formularioDesdeInsumo(insumo: Insumo): FormularioInsumoDatos {
  return {
    granja_id: insumo.granja_id,
    nombre: insumo.nombre,
    tipo: insumo.tipo ?? '',
    unidad_medida: insumo.unidad_medida,
    stock_actual: String(insumo.stock_actual),
    stock_minimo: String(insumo.stock_minimo),
    precio_unitario_cop:
      insumo.precio_unitario_cop === null ? '' : String(insumo.precio_unitario_cop),
    ubicacion_almacen: insumo.ubicacion_almacen ?? '',
    fecha_vencimiento: insumo.fecha_vencimiento?.slice(0, 10) ?? '',
    proveedor_habitual_id: insumo.proveedor_habitual_id ?? 0,
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
    granja_id: form.granja_id,
    nombre: form.nombre.trim(),
    unidad_medida: form.unidad_medida.trim(),
    tipo: textoOpcional(form.tipo),
    stock_actual: numeroOpcional(form.stock_actual),
    stock_minimo: numeroOpcional(form.stock_minimo),
    precio_unitario_cop: numeroOpcional(form.precio_unitario_cop),
    ubicacion_almacen: textoOpcional(form.ubicacion_almacen),
    fecha_vencimiento: textoOpcional(form.fecha_vencimiento),
    proveedor_habitual_id: form.proveedor_habitual_id > 0 ? form.proveedor_habitual_id : undefined,
  }
}

// Al editar no se toca el stock: eso solo cambia con un movimiento, que deja
// rastro. Permitirlo aquí abriría un camino para alterar la bodega sin
// registro y rompería la auditoría.
export function actualizarPayloadInsumo(form: FormularioInsumoDatos): ActualizarInsumoPayload {
  const payload = crearPayloadInsumo(form)
  const parcial = payload as Partial<CrearInsumoPayload>
  delete parcial.stock_actual
  // La granja tampoco se mueve al editar: cambiarla trasladaría el stock a
  // otra bodega sin dejar un movimiento que lo explique.
  delete parcial.granja_id
  return payload
}

// HU-58 · escenario 2. «Alimento Iniciación» y «alimento iniciacion » son el
// mismo insumo: se compara sin mayúsculas, tildes ni espacios sobrantes.
export function normalizarNombreInsumo(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('es-CO')
}

/**
 * El insumo activo de la misma granja con el mismo nombre y el mismo
 * proveedor, si existe. En ese caso no se crea otro: se ofrece sumar la
 * cantidad al existente con un movimiento de entrada, que deja rastro.
 */
export function buscarInsumoDuplicado(
  insumos: Pick<Insumo, 'id' | 'granja_id' | 'nombre' | 'proveedor_habitual_id' | 'activo'>[],
  form: Pick<FormularioInsumoDatos, 'granja_id' | 'nombre' | 'proveedor_habitual_id'>,
): number | null {
  const nombre = normalizarNombreInsumo(form.nombre)
  if (!nombre) return null
  const proveedor = form.proveedor_habitual_id > 0 ? form.proveedor_habitual_id : null
  const duplicado = insumos.find((insumo) =>
    insumo.activo
    && insumo.granja_id === form.granja_id
    && (insumo.proveedor_habitual_id ?? null) === proveedor
    && normalizarNombreInsumo(insumo.nombre) === nombre,
  )
  return duplicado?.id ?? null
}
