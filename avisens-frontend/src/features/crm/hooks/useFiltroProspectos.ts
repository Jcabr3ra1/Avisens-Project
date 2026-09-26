import { useMemo, useState } from 'react'
import type { EtapaProspecto, ProspectoVista } from '../model/prospectoVista'

export type Filtro = 'todos' | EtapaProspecto
export type FiltroCanal = 'todos' | 'web' | 'whatsapp'

export function useFiltroProspectos(prospectos: ProspectoVista[]) {
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [filtroCanal, setFiltroCanal] = useState<FiltroCanal>('todos')

  const visibles = useMemo(() => {
    let resultado = prospectos

    if (filtro !== 'todos') {
      resultado = resultado.filter((p) => p.etapa === filtro)
    }

    if (filtroCanal !== 'todos') {
      resultado = resultado.filter((p) => p.canal === filtroCanal)
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
  }, [prospectos, filtro, filtroCanal, busqueda])

  return {
    filtro,
    setFiltro,
    filtroCanal,
    setFiltroCanal,
    busqueda,
    setBusqueda,
    visibles,
  }
}
