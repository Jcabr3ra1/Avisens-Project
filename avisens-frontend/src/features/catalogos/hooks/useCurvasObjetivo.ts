import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { mensajeDeError } from '@shared/utils/errores'
import {
  actualizarCurvaObjetivo,
  crearCurvaObjetivo,
  eliminarCurvaObjetivo,
  listarCurvasObjetivo,
  type CrearCurvaObjetivoPayload,
  type CurvaObjetivo,
} from '@features/indicadores/api/curvas-objetivo'

export function useCurvasObjetivo() {
  const [curvas, setCurvas] = useState<CurvaObjetivo[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const recargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true)
    setError('')
    try {
      setCurvas(await listarCurvasObjetivo())
    } catch {
      if (!silencioso) setError('No se pudieron cargar las curvas objetivo.')
    } finally {
      if (!silencioso) setCargando(false)
    }
  }, [])

  useEffect(() => { void recargar() }, [recargar])

  const guardar = useCallback(async (
    payload: CrearCurvaObjetivoPayload,
    editandoId: number | null,
  ) => {
    if (editandoId === null) await crearCurvaObjetivo(payload)
    else await actualizarCurvaObjetivo(editandoId, payload)
    await recargar(true)
    toast.success(editandoId === null ? 'Punto de curva creado' : 'Punto de curva actualizado')
  }, [recargar])

  const eliminar = useCallback(async (curva: CurvaObjetivo) => {
    try {
      await eliminarCurvaObjetivo(curva.id)
      await recargar(true)
      toast.success('Punto de curva eliminado')
    } catch (problema) {
      // El backend devuelve 403 con un mensaje propio si se intenta borrar una
      // curva del manual. Ese texto es mejor que cualquiera que yo invente.
      toast.error(mensajeDeError(problema, 'No se pudo eliminar el punto.'))
    }
  }, [recargar])

  return { curvas, cargando, error, recargar, guardar, eliminar }
}
