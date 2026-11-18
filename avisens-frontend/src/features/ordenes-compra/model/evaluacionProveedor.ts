import type { OrdenCompra } from './ordenCompra'

// HU-32 · escenario 2. Al recibir un pedido el propietario califica al
// proveedor en tres criterios (de 1 a 5) y el sistema promedia con semáforo.

export type CriterioEvaluacion = 'calificacion_cumplimiento' | 'calificacion_calidad' | 'calificacion_tiempo'
export type Calificaciones = Record<CriterioEvaluacion, number>
export type Semaforo = 'verde' | 'ambar' | 'rojo'

export const CRITERIOS_EVALUACION: readonly {
  campo: CriterioEvaluacion
  etiqueta: string
  ayuda: string
}[] = [
  { campo: 'calificacion_cumplimiento', etiqueta: 'Cumplimiento', ayuda: '¿Llegó lo que se pidió, en la cantidad pedida?' },
  { campo: 'calificacion_calidad', etiqueta: 'Calidad', ayuda: '¿El producto llegó en buen estado y como se esperaba?' },
  { campo: 'calificacion_tiempo', etiqueta: 'Tiempo de entrega', ayuda: '¿Llegó en la fecha acordada?' },
]

export const NOTA_MINIMA = 1
export const NOTA_MAXIMA = 5

// Umbrales del semáforo sobre 5. Verde desde 4 (cumple bien), ámbar desde 3
// (cumple con reparos) y rojo por debajo (conviene buscar otra opción).
export const UMBRAL_VERDE = 4
export const UMBRAL_AMBAR = 3

export const ETIQUETA_SEMAFORO: Record<Semaforo, string> = {
  verde: 'Confiable',
  ambar: 'Con reparos',
  rojo: 'Bajo desempeño',
}

type OrdenCalificable = Pick<OrdenCompra, CriterioEvaluacion>

function redondear(valor: number): number {
  return Math.round(valor * 10) / 10
}

export function semaforoDe(promedio: number): Semaforo {
  if (promedio >= UMBRAL_VERDE) return 'verde'
  if (promedio >= UMBRAL_AMBAR) return 'ambar'
  return 'rojo'
}

export function estaEvaluada(orden: OrdenCalificable): boolean {
  return CRITERIOS_EVALUACION.every(({ campo }) => orden[campo] !== null && orden[campo] !== undefined)
}

/** Promedio de los tres criterios de un pedido, o null si no se ha calificado. */
export function promedioDeOrden(orden: OrdenCalificable): number | null {
  if (!estaEvaluada(orden)) return null
  const suma = CRITERIOS_EVALUACION.reduce((total, { campo }) => total + Number(orden[campo]), 0)
  return redondear(suma / CRITERIOS_EVALUACION.length)
}

/** Solo un pedido entregado y sin calificar queda pendiente de evaluar. */
export function pendienteDeEvaluar(orden: Pick<OrdenCompra, 'estado' | CriterioEvaluacion>): boolean {
  return orden.estado === 'entregada' && !estaEvaluada(orden)
}

export type DesempenoProveedor = {
  proveedorId: number
  nombre: string
  nit: string
  evaluaciones: number
  criterios: Calificaciones
  promedio: number
  semaforo: Semaforo
}

/**
 * Historial de desempeño por proveedor: promedia cada criterio sobre todos
 * sus pedidos calificados. Ordena del mejor al peor para decidir la compra.
 */
export function desempenoPorProveedor(
  ordenes: Pick<OrdenCompra, 'proveedor_id' | 'proveedor' | 'estado' | CriterioEvaluacion>[],
): DesempenoProveedor[] {
  const grupos = new Map<number, { nombre: string; nit: string; ordenes: OrdenCalificable[] }>()
  for (const orden of ordenes) {
    if (orden.estado !== 'entregada' || !estaEvaluada(orden)) continue
    const grupo = grupos.get(orden.proveedor_id)
      ?? { nombre: orden.proveedor.nombre, nit: orden.proveedor.nit, ordenes: [] }
    grupo.ordenes.push(orden)
    grupos.set(orden.proveedor_id, grupo)
  }

  return [...grupos.entries()]
    .map(([proveedorId, grupo]) => {
      const criterios = Object.fromEntries(
        CRITERIOS_EVALUACION.map(({ campo }) => [
          campo,
          redondear(grupo.ordenes.reduce((total, orden) => total + Number(orden[campo]), 0) / grupo.ordenes.length),
        ]),
      ) as Calificaciones
      const promedio = redondear(
        CRITERIOS_EVALUACION.reduce((total, { campo }) => total + criterios[campo], 0) / CRITERIOS_EVALUACION.length,
      )
      return {
        proveedorId,
        nombre: grupo.nombre,
        nit: grupo.nit,
        evaluaciones: grupo.ordenes.length,
        criterios,
        promedio,
        semaforo: semaforoDe(promedio),
      }
    })
    .sort((a, b) => b.promedio - a.promedio || a.nombre.localeCompare(b.nombre, 'es-CO'))
}

export function notaValida(valor: number | null | undefined): valor is number {
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= NOTA_MINIMA && valor <= NOTA_MAXIMA
}
