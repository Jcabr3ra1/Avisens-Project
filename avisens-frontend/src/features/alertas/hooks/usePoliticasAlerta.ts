import { useCallback, useEffect, useState } from 'react'
import {
  activarPoliticaAlerta,
  actualizarPoliticaAlerta,
  crearPoliticaAlerta,
  desactivarPoliticaAlerta,
  listarPoliticasAlerta,
  type ActualizarPoliticaAlertaPayload,
  type PoliticaAlerta,
} from '../api/politicas-alerta'
import type { CanalPolitica, CriticidadPolitica } from '../model/politicaAlerta'

export type DatosPolitica = {
  canal: CanalPolitica
  tiempo_max_respuesta_seg: number
}

// Las políticas de la granja (HU-25). El backend ya acota por dueño, así que
// el propietario solo recibe las de sus granjas; aquí se filtra por la abierta
// en el modelo (politicaDeNivel), no en la petición, porque el endpoint no
// admite filtro por granja.
export function usePoliticasAlerta() {
  const [politicas, setPoliticas] = useState<PoliticaAlerta[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const recargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      setPoliticas(await listarPoliticasAlerta())
    } catch {
      setError('No se pudo cargar la configuración de alertas.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { void recargar() }, [recargar])

  const crear = useCallback(async (granjaId: number, criticidad: CriticidadPolitica, datos: DatosPolitica) => {
    await crearPoliticaAlerta({ granja_id: granjaId, criticidad, activa: true, ...datos })
    await recargar()
  }, [recargar])

  const actualizar = useCallback(async (id: number, datos: ActualizarPoliticaAlertaPayload) => {
    await actualizarPoliticaAlerta(id, datos)
    await recargar()
  }, [recargar])

  const pausar = useCallback(async (id: number) => {
    await desactivarPoliticaAlerta(id)
    await recargar()
  }, [recargar])

  const reactivar = useCallback(async (id: number) => {
    await activarPoliticaAlerta(id)
    await recargar()
  }, [recargar])

  return { politicas, cargando, error, recargar, crear, actualizar, pausar, reactivar }
}
