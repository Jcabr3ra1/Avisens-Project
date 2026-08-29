import { useCallback, useEffect, useState } from 'react'
import { listarGranjas, type Granja } from '@features/granjas/api/granjas'
import {
  activarGalpon,
  actualizarGalpon,
  crearGalpon,
  desactivarGalpon,
  eliminarGalponPermanente,
  listarGalpones,
  type CrearGalponPayload,
  type Galpon,
} from '../api/galpones'
import { obtenerMensajeError } from '../model/errorApi'

export function useGalpones() {
  const [galpones, setGalpones] = useState<Galpon[]>([])
  const [granjas, setGranjas] = useState<Granja[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const recargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const [galponesData, granjasData] = await Promise.all([listarGalpones(), listarGranjas()])
      setGalpones(galponesData)
      setGranjas(granjasData.filter((granja) => granja.activa))
    } catch (errorCarga) {
      setError(obtenerMensajeError(errorCarga, 'No se pudieron cargar los galpones.'))
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void recargar()
  }, [recargar])

  const guardar = useCallback(
    async (datos: CrearGalponPayload, editandoId: number | null) => {
      if (editandoId === null) await crearGalpon(datos)
      else await actualizarGalpon(editandoId, datos)
      await recargar()
    },
    [recargar],
  )

  const alternarActivo = useCallback(
    async (galpon: Galpon) => {
      setError('')
      try {
        if (galpon.activo) await desactivarGalpon(galpon.id)
        else await activarGalpon(galpon.id)
        await recargar()
      } catch (errorAccion) {
        setError(obtenerMensajeError(errorAccion, 'No se pudo cambiar el estado del galpón.'))
      }
    },
    [recargar],
  )

  const eliminar = useCallback(
    async (galpon: Galpon) => {
      setError('')
      try {
        await eliminarGalponPermanente(galpon.id)
        await recargar()
      } catch (errorAccion) {
        setError(obtenerMensajeError(errorAccion, 'No se pudo eliminar el galpón.'))
      }
    },
    [recargar],
  )

  return { galpones, granjas, cargando, error, recargar, guardar, alternarActivo, eliminar }
}
