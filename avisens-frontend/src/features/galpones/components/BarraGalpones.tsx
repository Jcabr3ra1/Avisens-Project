import type { FiltroEstadoGalpon } from '../model/galponVista'

interface Props {
  busqueda: string
  estado: FiltroEstadoGalpon
  visibles: number
  total: number
  onBuscar: (valor: string) => void
  onCambiarEstado: (estado: FiltroEstadoGalpon) => void
}

function BarraGalpones({ busqueda, estado, visibles, total, onBuscar, onCambiarEstado }: Props) {
  return (
    <div className="galpones-barra">
      <input type="search" value={busqueda} onChange={(evento) => onBuscar(evento.target.value)} placeholder="Buscar por código, nombre o granja" aria-label="Buscar galpones" />
      <select value={estado} onChange={(evento) => onCambiarEstado(evento.target.value as FiltroEstadoGalpon)} aria-label="Filtrar galpones por estado">
        <option value="todos">Todos los estados</option>
        <option value="activos">Activos</option>
        <option value="inactivos">Inactivos</option>
      </select>
      <span>{visibles} de {total}</span>
    </div>
  )
}

export default BarraGalpones
