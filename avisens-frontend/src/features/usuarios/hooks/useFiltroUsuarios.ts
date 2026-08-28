import { useMemo, useState } from 'react'
import type { Usuario } from '@shared/api'

export function useFiltroUsuarios(usuarios: Usuario[]) {
  const [busqueda, setBusqueda] = useState('')

  const visibles = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    if (!termino) return usuarios

    return usuarios.filter(
      (usuario) =>
        usuario.nombre_completo.toLowerCase().includes(termino) ||
        usuario.email.toLowerCase().includes(termino) ||
        usuario.cedula.toLowerCase().includes(termino),
    )
  }, [busqueda, usuarios])

  return { busqueda, setBusqueda, visibles }
}
