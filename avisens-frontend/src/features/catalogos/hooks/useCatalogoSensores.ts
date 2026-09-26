import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { mensajeDeError } from '@shared/utils/errores'
import {
  activarCatalogoSensor,
  actualizarCatalogoSensor,
  crearCatalogoSensor,
  desactivarCatalogoSensor,
  listarCatalogoSensores,
  type CatalogoSensor,
  type CrearCatalogoSensorPayload,
} from '@features/sensores/api/catalogoSensores'

export function useCatalogoSensores() {
  const [sensores, setSensores] = useState<CatalogoSensor[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const recargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      setSensores(await listarCatalogoSensores())
    } catch {
      setError('No se pudo cargar el catálogo de sensores.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { void recargar() }, [recargar])

  const guardar = useCallback(async (
    payload: CrearCatalogoSensorPayload,
    editandoId: number | null,
  ) => {
    if (editandoId === null) await crearCatalogoSensor(payload)
    else await actualizarCatalogoSensor(editandoId, payload)
    await recargar()
  }, [recargar])

  const alternar = useCallback(async (sensor: CatalogoSensor) => {
    try {
      if (sensor.activo) await desactivarCatalogoSensor(sensor.id)
      else await activarCatalogoSensor(sensor.id)
      await recargar()
      toast.success(sensor.activo ? 'Sensor retirado del catálogo' : 'Sensor disponible otra vez')
    } catch (problema) {
      toast.error(mensajeDeError(problema, 'No se pudo cambiar el estado del sensor.'))
    }
  }, [recargar])

  return { sensores, cargando, error, recargar, guardar, alternar }
}
