import { useCallback, useEffect, useState } from 'react'
import {
  activarGranja,
  actualizarGranja,
  crearGranja,
  desactivarGranja,
  eliminarGranjaPermanente,
  listarGranjas,
  type CrearGranjaPayload,
  type Granja,
} from '../api/granjas'
import { obtenerMensajeError } from '../model/errorApi'

export function useGranjas() {
  const [granjas, setGranjas] = useState<Granja[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const recargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      setGranjas(await listarGranjas())
    } catch (errorCarga) {
      setError(obtenerMensajeError(errorCarga, 'No se pudieron cargar las granjas.'))
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void recargar()
  }, [recargar])

  const guardar = useCallback(
    async (datos: CrearGranjaPayload, editandoId: number | null) => {
      if (editandoId === null) await crearGranja(datos)
      else await actualizarGranja(editandoId, datos)
      await recargar()
    },
    [recargar],
  )

  const alternarActivo = useCallback(
    async (granja: Granja) => {
      setError('')
      try {
        if (granja.activa) await desactivarGranja(granja.id)
        else await activarGranja(granja.id)
        await recargar()
      } catch (errorAccion) {
        setError(obtenerMensajeError(errorAccion, 'No se pudo cambiar el estado de la granja.'))
      }
    },
    [recargar],
  )

  const eliminar = useCallback(
    async (granja: Granja) => {
      setError('')
      try {
        await eliminarGranjaPermanente(granja.id)
        await recargar()
      } catch (errorAccion) {
        setError(obtenerMensajeError(errorAccion, 'No se pudo eliminar la granja.'))
      }
    },
    [recargar],
  )

  return { granjas, cargando, error, recargar, guardar, alternarActivo, eliminar }
}
