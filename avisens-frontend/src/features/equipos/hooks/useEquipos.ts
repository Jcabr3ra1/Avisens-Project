import { useCallback, useEffect, useState } from 'react'
import { mensajeDeError } from '@shared/utils/errores'
import {
  actualizarEquipo,
  crearEquipo,
  eliminarEquipo,
  listarEquipos,
  type ActualizarEquipoPayload,
  type CrearEquipoPayload,
  type Equipo,
} from '../api/equipos'

export function useEquipos(galponId: number) {
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const todos = await listarEquipos()
      setEquipos(todos.filter((equipo) => equipo.galpon_id === galponId))
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudieron cargar los equipos.'))
    } finally {
      setCargando(false)
    }
  }, [galponId])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const crear = useCallback(async (payload: CrearEquipoPayload) => {
    const creado = await crearEquipo(payload)
    setEquipos((actuales) => [creado, ...actuales])
    return creado
  }, [])

  const actualizar = useCallback(
    async (id: number, payload: ActualizarEquipoPayload) => {
      const actualizado = await actualizarEquipo(id, payload)
      setEquipos((actuales) =>
        actuales.map((actual) => (actual.id === id ? actualizado : actual)),
      )
      return actualizado
    },
    [],
  )

  const eliminar = useCallback(async (id: number) => {
    await eliminarEquipo(id)
    setEquipos((actuales) => actuales.filter((actual) => actual.id !== id))
  }, [])

  return { equipos, cargando, error, crear, actualizar, eliminar, recargar: cargar }
}
