import BarraHerramientas, { type OpcionFiltro } from '@shared/ui/admin/BarraHerramientas'
import type { FiltroEstadoLote } from '../model/loteVista'

interface Props {
  busqueda: string
  estado: FiltroEstadoLote
  visibles: number
  total: number
  onBuscar: (valor: string) => void
  onCambiarEstado: (estado: FiltroEstadoLote) => void
}

const OPCIONES: OpcionFiltro<FiltroEstadoLote>[] = [
  { valor: 'todos', label: 'Todos' },
  { valor: 'activo', label: 'Activos' },
  { valor: 'finalizado', label: 'Finalizados' },
  { valor: 'inactivo', label: 'Inactivos' },
]

function BarraLotes({ busqueda, estado, visibles, total, onBuscar, onCambiarEstado }: Props) {
  return (
    <BarraHerramientas
      busqueda={busqueda}
      placeholder="Buscar por código, galpón o proveedor"
      etiquetaBusqueda="Buscar lotes"
      onBuscar={onBuscar}
      filtro={estado}
      opciones={OPCIONES}
      etiquetaFiltro="Filtrar lotes por estado"
      onCambiarFiltro={onCambiarEstado}
      visibles={visibles}
      total={total}
    />
  )
}

export default BarraLotes
