import { useCallback, useEffect, useState } from 'react'
import { activarSensor, actualizarSensor, crearSensor, desactivarSensor, eliminarSensor, listarSensores, type ActualizarSensorPayload, type CrearSensorPayload, type Sensor } from '@features/sensores/api/sensores'
import { mensajeDeError } from '@shared/utils/errores'

export function useSensores(galponId?: number) {
  const [sensores, setSensores] = useState<Sensor[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const todos = await listarSensores()
      setSensores(
        galponId === undefined
          ? todos
          : todos.filter((s) => s.galpon.id === galponId),
      )
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudieron cargar los sensores.'))
    } finally {
      setCargando(false)
    }
  }, [galponId])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const crear = useCallback(async (payload: CrearSensorPayload) => {
    const creado = await crearSensor(payload)
    setSensores((actuales) => [creado, ...actuales])
    return creado
  }, [])

  const alternar = useCallback(async (sensor: Sensor) => {
    const resultado =
      sensor.estado === 'activo'
        ? await desactivarSensor(sensor.id)
        : await activarSensor(sensor.id)
    setSensores((actuales) =>
      actuales.map((actual) =>
        actual.id === sensor.id ? { ...actual, estado: resultado.estado } : actual,
      ),
    )
    return resultado
  }, [])

  const eliminar = useCallback(async (id: number) => {
    await eliminarSensor(id)
    setSensores((actuales) => actuales.filter((actual) => actual.id !== id))
  }, [])

  // Corregir un sensor sin borrarlo: un código mal tecleado se arreglaba
  // eliminando y volviendo a crear, y eso se lleva por delante sus mediciones.
  async function actualizar(id: number, payload: ActualizarSensorPayload) {
    const actualizado = await actualizarSensor(id, payload)
    await cargar()
    return actualizado
  }

  return { sensores, cargando, error, crear, actualizar, alternar, eliminar, recargar: cargar }
}
