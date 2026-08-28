import { useMemo, useState } from 'react'
import type { EtapaProspecto, ProspectoVista } from '../model/prospectoVista'

export type Vista = 'kanban' | 'tabla'
export type Filtro = 'todos' | EtapaProspecto

export function useFiltroProspectos(prospectos: ProspectoVista[]) {
  const [vista, setVista] = useState<Vista>('kanban')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [busqueda, setBusqueda] = useState('')

  const visibles = useMemo(() => {
    let resultado = prospectos

    if (vista === 'tabla' && filtro !== 'todos') {
      resultado = resultado.filter((p) => p.etapa === filtro)
    }

    const termino = busqueda.trim().toLowerCase()
    if (termino) {
      resultado = resultado.filter(
        (p) =>
          p.nombre.toLowerCase().includes(termino) ||
          p.granja.toLowerCase().includes(termino) ||
          p.municipio.toLowerCase().includes(termino),
      )
    }

    return resultado
  }, [prospectos, vista, filtro, busqueda])

  return { vista, setVista, filtro, setFiltro, busqueda, setBusqueda, visibles }
}
