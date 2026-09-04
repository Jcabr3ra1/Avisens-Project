import { useCallback, useEffect, useState } from 'react'
import { mensajeDeError } from '@shared/utils/errores'
import {
  activarDispositivo,
  crearDispositivo,
  desactivarDispositivo,
  eliminarDispositivoPermanente,
  listarDispositivos,
  regenerarTokenDispositivo,
  type CrearDispositivoPayload,
  type Dispositivo,
} from '../api/dispositivos'

export function useDispositivos(galponId: number) {
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const todos = await listarDispositivos()
      setDispositivos(todos.filter((d) => d.galpon.id === galponId))
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudieron cargar los dispositivos.'))
    } finally {
      setCargando(false)
    }
  }, [galponId])

  useEffect(() => {
    void cargar()
  }, [cargar])

  // Las mutaciones no atrapan el error a propósito: quien las llama lo muestra
  // donde el usuario está mirando, dentro del formulario o de la fila.
  const crear = useCallback(async (payload: CrearDispositivoPayload) => {
    const creado = await crearDispositivo(payload)
    setDispositivos((actuales) => [creado, ...actuales])
    return creado
  }, [])

  const alternar = useCallback(async (dispositivo: Dispositivo) => {
    const resultado = dispositivo.activo
      ? await desactivarDispositivo(dispositivo.id)
      : await activarDispositivo(dispositivo.id)
    setDispositivos((actuales) =>
      actuales.map((actual) =>
        actual.id === dispositivo.id
          ? { ...actual, activo: resultado.activo }
          : actual,
      ),
    )
    return resultado
  }, [])

  const regenerarToken = useCallback(async (id: number) => {
    return regenerarTokenDispositivo(id)
  }, [])

  const eliminar = useCallback(async (id: number) => {
    await eliminarDispositivoPermanente(id)
    setDispositivos((actuales) => actuales.filter((actual) => actual.id !== id))
  }, [])

  return {
    dispositivos,
    cargando,
    error,
    crear,
    alternar,
    regenerarToken,
    eliminar,
    recargar: cargar,
  }
}
