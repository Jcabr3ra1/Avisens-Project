import { describe, expect, it, vi } from 'vitest'
import { crearGestorConfirmacion, type OpcionesConfirmacion } from './gestorConfirmacion'

const opciones: OpcionesConfirmacion = {
  titulo: '¿Eliminar este sensor?', descripcion: 'Su historial se conserva.', textoConfirmar: 'Eliminar sensor',
}
function preparar() {
  const gestor = crearGestorConfirmacion()
  gestor.subscribe(() => {})
  return gestor
}
function deferida() {
  let resolver!: () => void
  const promesa = new Promise<void>(resolve => { resolver = resolve })
  return { promesa, resolver }
}

describe('confirmaciones de acciones', () => {
  it('cancelar nunca ejecuta la operación y resuelve después de la salida', async () => {
    const gestor = preparar()
    const operacion = vi.fn()
    const resultado = gestor.solicitar({ ...opciones, onConfirmar: operacion })
    gestor.cancelar()
    expect(gestor.getSnapshot()?.fase).toBe('cerrando')
    expect(operacion).not.toHaveBeenCalled()
    gestor.finalizarSalida()
    expect(await resultado).toBe(false)
  })

  it('espera a la salida antes de autorizar una operación externa', async () => {
    const gestor = preparar()
    const operacion = vi.fn()
    const resultado = gestor.solicitar(opciones).then(ok => { if (ok) operacion(); return ok })
    await gestor.confirmar()
    expect(operacion).not.toHaveBeenCalled()
    gestor.finalizarSalida()
    expect(await resultado).toBe(true)
    expect(operacion).toHaveBeenCalledOnce()
  })

  it('un doble clic y Escape durante el envío no duplican ni cancelan la operación', async () => {
    const gestor = preparar()
    const tarea = deferida()
    const operacion = vi.fn(() => tarea.promesa)
    const resultado = gestor.solicitar({ ...opciones, onConfirmar: operacion })
    const envio = gestor.confirmar()
    await gestor.confirmar()
    gestor.cancelar()
    expect(gestor.getSnapshot()?.fase).toBe('procesando')
    expect(operacion).toHaveBeenCalledOnce()
    tarea.resolver()
    await envio
    gestor.finalizarSalida()
    expect(await resultado).toBe(true)
  })

  it('un error mantiene la confirmación abierta y permite reintentar', async () => {
    const gestor = preparar()
    const operacion = vi.fn().mockRejectedValueOnce(new Error('sin red')).mockResolvedValueOnce(undefined)
    const resultado = gestor.solicitar({ ...opciones, onConfirmar: operacion })
    await gestor.confirmar()
    expect(gestor.getSnapshot()?.fase).toBe('abierta')
    expect(gestor.getSnapshot()?.error).toContain('Inténtalo de nuevo')
    await gestor.confirmar()
    gestor.finalizarSalida()
    expect(await resultado).toBe(true)
    expect(operacion).toHaveBeenCalledTimes(2)
  })

  it('una segunda solicitud no reemplaza la decisión que el usuario está leyendo', async () => {
    const gestor = preparar()
    const primera = gestor.solicitar(opciones)
    expect(await gestor.solicitar({ ...opciones, entidad: 'Otro sensor' })).toBe(false)
    expect(gestor.getSnapshot()?.opciones).toBe(opciones)
    gestor.cancelarTodo()
    expect(await primera).toBe(false)
  })

  it('al cambiar de ruta cancela la decisión y descarta respuestas tardías', async () => {
    const gestor = preparar()
    const tarea = deferida()
    const repetidas = { ...opciones, onConfirmar: () => tarea.promesa }
    const primera = gestor.solicitar(repetidas)
    const envio = gestor.confirmar()
    gestor.cancelarTodo()
    expect(await primera).toBe(false)
    const segunda = gestor.solicitar(repetidas)
    tarea.resolver()
    await envio
    expect(gestor.getSnapshot()?.fase).toBe('abierta')
    gestor.cancelarTodo()
    expect(await segunda).toBe(false)
  })

  it('sin interfaz montada cancela en vez de dejar una promesa pendiente', async () => {
    expect(await crearGestorConfirmacion().solicitar(opciones)).toBe(false)
  })
})
