import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Usuario } from '@shared/api'
import {
  filtrarUsuarios,
  type FiltroEstadoUsuario,
  type FiltroRolUsuario,
} from '../model/directorioUsuarios'

export type { FiltroEstadoUsuario, FiltroRolUsuario }

const ROLES_VALIDOS: FiltroRolUsuario[] = ['todos', 'Administrador', 'Propietario', 'Operario']

function leerRolInicial(valor: string | null): FiltroRolUsuario {
  if (!valor) return 'todos'
  return ROLES_VALIDOS.includes(valor as FiltroRolUsuario) ? (valor as FiltroRolUsuario) : 'todos'
}

export function useFiltroUsuarios(usuarios: Usuario[]) {
  const [parametros, setParametros] = useSearchParams()
  const [busqueda, setBusqueda] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState<FiltroEstadoUsuario>('todos')
  const [rolFiltro, setRolFiltro] = useState<FiltroRolUsuario>(() =>
    leerRolInicial(parametros.get('rol')),
  )

  useEffect(() => {
    const desdeUrl = leerRolInicial(parametros.get('rol'))
    setRolFiltro(desdeUrl)
  }, [parametros])

  function cambiarRolFiltro(nuevoRol: FiltroRolUsuario) {
    setRolFiltro(nuevoRol)
    const siguientes = new URLSearchParams(parametros)
    if (nuevoRol === 'todos') {
      siguientes.delete('rol')
    } else {
      siguientes.set('rol', nuevoRol)
    }
    setParametros(siguientes, { replace: true })
  }

  function limpiarFiltros() {
    setBusqueda('')
    setEstadoFiltro('todos')
    if (rolFiltro !== 'todos') cambiarRolFiltro('todos')
  }

  const visibles = useMemo(
    () => filtrarUsuarios(usuarios, { busqueda, rol: rolFiltro, estado: estadoFiltro }),
    [busqueda, estadoFiltro, rolFiltro, usuarios],
  )

  return {
    busqueda,
    setBusqueda,
    rolFiltro,
    setRolFiltro: cambiarRolFiltro,
    estadoFiltro,
    setEstadoFiltro,
    limpiarFiltros,
    visibles,
  }
}
