import type { FiltroEstadoLote } from '../model/loteVista'

interface Props {
  busqueda: string
  estado: FiltroEstadoLote
  visibles: number
  total: number
  onBuscar: (valor: string) => void
  onCambiarEstado: (estado: FiltroEstadoLote) => void
}

function BarraLotes({ busqueda, estado, visibles, total, onBuscar, onCambiarEstado }: Props) {
  return (
    <div className="lotes-barra">
      <input
        type="search"
        value={busqueda}
        onChange={(evento) => onBuscar(evento.target.value)}
        placeholder="Buscar por código, galpón o proveedor"
        aria-label="Buscar lotes"
      />
      <select
        value={estado}
        onChange={(evento) => onCambiarEstado(evento.target.value as FiltroEstadoLote)}
        aria-label="Filtrar por estado"
      >
        <option value="todos">Todos los estados</option>
        <option value="activo">Activos</option>
        <option value="finalizado">Finalizados</option>
        <option value="inactivo">Inactivos</option>
      </select>
      <span>{visibles} de {total}</span>
    </div>
  )
}

export default BarraLotes
