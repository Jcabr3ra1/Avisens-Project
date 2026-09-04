import { useCallback, useEffect, useState } from 'react'
import { mensajeDeError } from '@shared/utils/errores'
import {
  actualizarInsumo,
  activarInsumo,
  crearInsumo,
  desactivarInsumo,
  eliminarInsumoPermanente,
  listarInsumos,
  registrarMovimientoInsumo,
  type ActualizarInsumoPayload,
  type CrearInsumoPayload,
  type Insumo,
  type RegistrarMovimientoPayload,
} from '../api/insumos'

export function useInventario() {
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const recargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      setInsumos(await listarInsumos())
    } catch (errorCarga) {
      setError(mensajeDeError(errorCarga, 'No se pudo cargar la bodega.'))
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void recargar()
  }, [recargar])

  const guardar = useCallback(
    async (datos: CrearInsumoPayload | ActualizarInsumoPayload, editandoId: number | null) => {
      if (editandoId === null) await crearInsumo(datos as CrearInsumoPayload)
      else await actualizarInsumo(editandoId, datos)
      await recargar()
    },
    [recargar],
  )

  const alternarActivo = useCallback(
    async (insumo: Insumo) => {
      setError('')
      try {
        if (insumo.activo) await desactivarInsumo(insumo.id)
        else await activarInsumo(insumo.id)
        await recargar()
      } catch (errorAccion) {
        setError(mensajeDeError(errorAccion, 'No se pudo cambiar el estado del insumo.'))
      }
    },
    [recargar],
  )

  const eliminar = useCallback(
    async (insumo: Insumo) => {
      setError('')
      try {
        await eliminarInsumoPermanente(insumo.id)
        await recargar()
      } catch (errorAccion) {
        setError(mensajeDeError(errorAccion, 'No se pudo eliminar el insumo.'))
      }
    },
    [recargar],
  )

  // El backend devuelve el stock que quedó, así que la tarjeta se actualiza
  // con ese número en vez de recalcularlo aquí y arriesgar una diferencia.
  const registrarMovimiento = useCallback(
    async (insumoId: number, payload: RegistrarMovimientoPayload) => {
      const movimiento = await registrarMovimientoInsumo(insumoId, payload)
      setInsumos((previos) =>
        previos.map((insumo) =>
          insumo.id === insumoId
            ? { ...insumo, stock_actual: movimiento.stock_resultante ?? insumo.stock_actual }
            : insumo,
        ),
      )
      return movimiento
    },
    [],
  )

  return { insumos, cargando, error, recargar, guardar, alternarActivo, eliminar, registrarMovimiento }
}
