import { useCallback, useEffect, useState } from 'react'
import { activarSensor, crearSensor, desactivarSensor, eliminarSensor, listarSensores, type CrearSensorPayload, type Sensor } from '@features/sensores/api/sensores'
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

  return { sensores, cargando, error, crear, alternar, eliminar, recargar: cargar }
}
