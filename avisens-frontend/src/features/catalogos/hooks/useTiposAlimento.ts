import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { mensajeDeError } from '@shared/utils/errores'
import {
  activarTipoAlimento,
  actualizarTipoAlimento,
  crearTipoAlimento,
  desactivarTipoAlimento,
  eliminarTipoAlimentoPermanente,
  listarTiposAlimento,
  type CrearTipoAlimentoPayload,
  type TipoAlimento,
} from '@features/consumos-diarios/api/tipos-alimento'

export function useTiposAlimento() {
  const [tipos, setTipos] = useState<TipoAlimento[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const recargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      // `false` para traer también los desactivados: esta pantalla tiene que
      // poder reactivarlos, y si no los ve no puede.
      setTipos(await listarTiposAlimento(false))
    } catch {
      setError('No se pudieron cargar los tipos de alimento.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { void recargar() }, [recargar])

  const guardar = useCallback(async (
    payload: CrearTipoAlimentoPayload,
    editandoId: number | null,
  ) => {
    if (editandoId === null) await crearTipoAlimento(payload)
    else await actualizarTipoAlimento(editandoId, payload)
    await recargar()
  }, [recargar])

  const alternar = useCallback(async (tipo: TipoAlimento) => {
    try {
      if (tipo.activo) await desactivarTipoAlimento(tipo.id)
      else await activarTipoAlimento(tipo.id)
      await recargar()
      toast.success(tipo.activo ? 'Alimento retirado del catálogo' : 'Alimento disponible otra vez')
    } catch (problema) {
      toast.error(mensajeDeError(problema, 'No se pudo cambiar el estado del alimento.'))
    }
  }, [recargar])

  const eliminar = useCallback(async (tipo: TipoAlimento) => {
    try {
      await eliminarTipoAlimentoPermanente(tipo.id)
      await recargar()
      toast.success('Tipo de alimento eliminado')
    } catch (problema) {
      toast.error(mensajeDeError(
        problema,
        'No se pudo eliminar. Puede que haya consumos registrados con este alimento.',
      ))
    }
  }, [recargar])

  return { tipos, cargando, error, recargar, guardar, alternar, eliminar }
}
