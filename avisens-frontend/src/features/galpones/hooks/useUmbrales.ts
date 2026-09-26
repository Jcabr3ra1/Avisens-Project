import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { mensajeDeError } from '@shared/utils/errores'
import {
  crearUmbral,
  jubilarUmbral,
  listarUmbrales,
  revisarUmbral,
  type CrearUmbralPayload,
  type RevisarUmbralPayload,
  type Umbral,
} from '../api/umbrales'

export function useUmbrales(galponId: number) {
  const [umbrales, setUmbrales] = useState<Umbral[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const recargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      setUmbrales(await listarUmbrales({ galpon_id: galponId }))
    } catch {
      setError('No se pudieron cargar los umbrales de este galpón.')
    } finally {
      setCargando(false)
    }
  }, [galponId])

  useEffect(() => { void recargar() }, [recargar])

  const crear = useCallback(async (payload: CrearUmbralPayload) => {
    await crearUmbral(payload)
    await recargar()
  }, [recargar])

  // No es una edición: el backend crea una versión nueva y jubila la anterior,
  // así que queda el rastro de cuál estaba vigente cuando saltó cada alerta.
  const revisar = useCallback(async (id: number, payload: RevisarUmbralPayload) => {
    await revisarUmbral(id, payload)
    await recargar()
  }, [recargar])

  const jubilar = useCallback(async (umbral: Umbral) => {
    try {
      await jubilarUmbral(umbral.id)
      await recargar()
      toast.success('Umbral jubilado: esa semana deja de compararse')
    } catch (problema) {
      toast.error(mensajeDeError(problema, 'No se pudo jubilar el umbral.'))
    }
  }, [recargar])

  return { umbrales, cargando, error, recargar, crear, revisar, jubilar }
}
