import { useMemo, useState } from 'react'
import type { Galpon } from '../api/galpones'
import { filtrarGalpones, type FiltroEstadoGalpon } from '../model/galponVista'

export function useFiltroGalpones(galpones: Galpon[]) {
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState<FiltroEstadoGalpon>('todos')
  const visibles = useMemo(
    () => filtrarGalpones(galpones, busqueda, estado),
    [galpones, busqueda, estado],
  )
  return { busqueda, setBusqueda, estado, setEstado, visibles }
}
