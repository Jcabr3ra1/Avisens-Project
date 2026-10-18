import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Usuario } from '@shared/api'

export type FiltroRolUsuario = 'todos' | 'Administrador' | 'Propietario' | 'Operario'

const ROLES_VALIDOS: FiltroRolUsuario[] = ['todos', 'Administrador', 'Propietario', 'Operario']

function leerRolInicial(valor: string | null): FiltroRolUsuario {
  if (!valor) return 'todos'
  return ROLES_VALIDOS.includes(valor as FiltroRolUsuario) ? (valor as FiltroRolUsuario) : 'todos'
}

export function useFiltroUsuarios(usuarios: Usuario[]) {
  const [parametros, setParametros] = useSearchParams()
  const [busqueda, setBusqueda] = useState('')
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

  const visibles = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    return usuarios.filter((usuario) => {
      if (rolFiltro !== 'todos' && usuario.rol.nombre !== rolFiltro) return false
      if (!termino) return true
      return (
        usuario.nombre_completo.toLowerCase().includes(termino) ||
        usuario.username.toLowerCase().includes(termino) ||
        (usuario.email ?? '').toLowerCase().includes(termino) ||
        usuario.cedula.toLowerCase().includes(termino)
      )
    })
  }, [busqueda, rolFiltro, usuarios])

  return { busqueda, setBusqueda, rolFiltro, setRolFiltro: cambiarRolFiltro, visibles }
}
