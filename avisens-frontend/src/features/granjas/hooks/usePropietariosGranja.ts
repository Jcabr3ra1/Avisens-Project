import { useEffect, useState } from 'react'
import {
  listarPropietariosGranja,
  type PropietarioGranja,
} from '../api/granjas'
import { obtenerMensajeError } from '../model/errorApi'

export function usePropietariosGranja(habilitado: boolean) {
  const [propietarios, setPropietarios] = useState<PropietarioGranja[]>([])
  const [cargando, setCargando] = useState(habilitado)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!habilitado) {
      setCargando(false)
      return
    }

    let activo = true

    async function cargar() {
      setCargando(true)
      setError('')

      try {
        const lista = await listarPropietariosGranja()
        if (activo) setPropietarios(lista)
      } catch (errorCarga) {
        if (activo) {
          setError(
            obtenerMensajeError(
              errorCarga,
              'No se pudieron cargar los propietarios.',
            ),
          )
        }
      } finally {
        if (activo) setCargando(false)
      }
    }

    void cargar()

    return () => {
      activo = false
    }
  }, [habilitado])

  return { propietarios, cargando, error }
}
