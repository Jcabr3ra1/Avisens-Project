import { useCallback, useEffect, useState } from 'react'
import { mensajeDeError } from '@shared/utils/errores'
import {
  actualizarMantenimiento,
  crearMantenimiento,
  eliminarMantenimiento,
  listarMantenimientos,
  type CrearMantenimientoPayload,
  type Mantenimiento,
} from '../api/mantenimientos'

export function useMantenimientos(equipoId: number) {
  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const todos = await listarMantenimientos()
      setMantenimientos(todos.filter((m) => m.equipo_id === equipoId))
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudieron cargar los mantenimientos.'))
    } finally {
      setCargando(false)
    }
  }, [equipoId])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const crear = useCallback(async (payload: CrearMantenimientoPayload) => {
    const creado = await crearMantenimiento(payload)
    setMantenimientos((actuales) => [creado, ...actuales])
    return creado
  }, [])

  const marcarCompletado = useCallback(async (id: number) => {
    const actualizado = await actualizarMantenimiento(id, {
      estado: 'completado',
      fecha_ejecucion: new Date().toISOString(),
    })
    setMantenimientos((actuales) =>
      actuales.map((actual) => (actual.id === id ? actualizado : actual)),
    )
    return actualizado
  }, [])

  const eliminar = useCallback(async (id: number) => {
    await eliminarMantenimiento(id)
    setMantenimientos((actuales) => actuales.filter((actual) => actual.id !== id))
  }, [])

  return {
    mantenimientos,
    cargando,
    error,
    crear,
    marcarCompletado,
    eliminar,
    recargar: cargar,
  }
}
