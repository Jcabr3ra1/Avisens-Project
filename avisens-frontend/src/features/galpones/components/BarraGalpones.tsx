import BarraHerramientas, { type OpcionFiltro } from '@shared/ui/admin/BarraHerramientas'
import type { FiltroEstadoGalpon } from '../model/galponVista'

interface Props {
  busqueda: string
  estado: FiltroEstadoGalpon
  visibles: number
  total: number
  onBuscar: (valor: string) => void
  onCambiarEstado: (estado: FiltroEstadoGalpon) => void
}

const OPCIONES: OpcionFiltro<FiltroEstadoGalpon>[] = [
  { valor: 'todos', label: 'Todos' },
  { valor: 'activos', label: 'Activos' },
  { valor: 'inactivos', label: 'Inactivos' },
]

function BarraGalpones({ busqueda, estado, visibles, total, onBuscar, onCambiarEstado }: Props) {
  return (
    <BarraHerramientas
      busqueda={busqueda}
      placeholder="Buscar por código, nombre o granja"
      etiquetaBusqueda="Buscar galpones"
      onBuscar={onBuscar}
      filtro={estado}
      opciones={OPCIONES}
      etiquetaFiltro="Filtrar galpones por estado"
      onCambiarFiltro={onCambiarEstado}
      visibles={visibles}
      total={total}
    />
  )
}

export default BarraGalpones
