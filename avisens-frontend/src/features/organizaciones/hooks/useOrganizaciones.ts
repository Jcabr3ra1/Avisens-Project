import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { mensajeDeError } from '@shared/utils/errores'
import {
  activarOrganizacion,
  actualizarOrganizacion,
  crearOrganizacion,
  desactivarOrganizacion,
  listarOrganizaciones,
  type CrearOrganizacionPayload,
  type Organizacion,
} from '../api/organizaciones'

export function useOrganizaciones() {
  const [organizaciones, setOrganizaciones] = useState<Organizacion[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const recargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      // El servidor ya devuelve `_count` con las granjas y los usuarios de cada
      // organización, calculado sobre las relaciones. No se derivan en el
      // cliente a propósito: hacerlo desde `listarGranjas()` los dejaría a
      // merced del alcance por rol de quien mire.
      setOrganizaciones(await listarOrganizaciones())
    } catch {
      setError('No se pudieron cargar las organizaciones.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { void recargar() }, [recargar])

  const guardar = useCallback(async (
    payload: CrearOrganizacionPayload,
    editandoId: number | null,
  ) => {
    if (editandoId === null) await crearOrganizacion(payload)
    else await actualizarOrganizacion(editandoId, payload)
    await recargar()
  }, [recargar])

  const alternar = useCallback(async (organizacion: Organizacion) => {
    try {
      if (organizacion.activa) await desactivarOrganizacion(organizacion.id)
      else await activarOrganizacion(organizacion.id)
      await recargar()
      toast.success(
        organizacion.activa
          ? `${organizacion.nombre} queda suspendida`
          : `${organizacion.nombre} vuelve a estar activa`,
      )
    } catch (problema) {
      toast.error(mensajeDeError(problema, 'No se pudo cambiar el estado de la organización.'))
    }
  }, [recargar])

  return { organizaciones, cargando, error, recargar, guardar, alternar }
}
