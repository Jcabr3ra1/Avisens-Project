import { mensajeDeError } from '@shared/utils/errores'

export type OpcionesConfirmacion = {
  titulo: string
  descripcion: string
  entidad?: string
  textoConfirmar: string
  tono?: 'peligro' | 'aviso' | 'normal'
  textoProcesando?: string
  onConfirmar?: () => Promise<unknown>
}

export type Confirmacion = {
  opciones: OpcionesConfirmacion
  fase: 'abierta' | 'procesando' | 'cerrando'
  error: string
}

/** Una sola decisión activa; una segunda petición nunca confirma otra acción. */
export function crearGestorConfirmacion() {
  let actual: Confirmacion | null = null
  let resolver: ((valor: boolean) => void) | null = null
  let resultado = false
  let version = 0
  const oyentes = new Set<() => void>()
  const emitir = () => oyentes.forEach(oyente => oyente())

  function cerrar(valor: boolean) {
    if (!actual || actual.fase === 'cerrando') return
    resultado = valor
    actual = { ...actual, fase: 'cerrando' }
    emitir()
  }

  function finalizarSalida() {
    if (!actual || actual.fase !== 'cerrando') return
    const terminar = resolver
    const valor = resultado
    resolver = null
    actual = null
    emitir()
    terminar?.(valor)
  }

  function cancelarTodo() {
    version++
    const terminar = resolver
    resolver = null
    actual = null
    emitir()
    terminar?.(false)
  }

  return {
    getSnapshot: () => actual,
    subscribe(oyente: () => void) {
      oyentes.add(oyente)
      return () => { oyentes.delete(oyente) }
    },
    solicitar(opciones: OpcionesConfirmacion): Promise<boolean> {
      if (actual || oyentes.size === 0) return Promise.resolve(false)
      return new Promise(resolve => {
        version++
        resolver = resolve
        resultado = false
        actual = { opciones, fase: 'abierta', error: '' }
        emitir()
      })
    },
    async confirmar() {
      if (!actual || actual.fase !== 'abierta') return
      if (!actual.opciones.onConfirmar) { cerrar(true); return }
      const opciones = actual.opciones
      const solicitud = version
      actual = { ...actual, fase: 'procesando', error: '' }
      emitir()
      try {
        await opciones.onConfirmar?.()
        if (version === solicitud && actual?.opciones === opciones) cerrar(true)
      } catch (error) {
        if (version !== solicitud || actual?.opciones !== opciones) return
        actual = {
          opciones, fase: 'abierta',
          error: mensajeDeError(error, 'No se pudo completar la acción. Inténtalo de nuevo.'),
        }
        emitir()
      }
    },
    cancelar() {
      if (actual?.fase === 'abierta') cerrar(false)
    },
    finalizarSalida,
    cancelarTodo,
  }
}

export const gestorConfirmacion = crearGestorConfirmacion()
export const confirmarAccion = gestorConfirmacion.solicitar
