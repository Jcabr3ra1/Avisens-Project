import { IcSearch } from '@shared/ui/icons/icons'

type Props = {
  busqueda: string
  estado: 'todos' | 'activos' | 'inactivos'
  visibles: number
  total: number
  onBuscar: (valor: string) => void
  onCambiarEstado: (estado: 'todos' | 'activos' | 'inactivos') => void
}

function BarraProveedores({ busqueda, estado, visibles, total, onBuscar, onCambiarEstado }: Props) {
  return (
    <div className="prv-barra">
      <label className="prv-busqueda">
        <IcSearch size={18} aria-hidden="true" />
        <span className="prv-sr-only">Buscar proveedor</span>
        <input
          value={busqueda}
          onChange={(evento) => onBuscar(evento.target.value)}
          placeholder="Buscar por nombre, NIT o contacto"
        />
      </label>

      <label className="prv-estado-filtro">
        <span>Estado</span>
        <select value={estado} onChange={(evento) => onCambiarEstado(evento.target.value as Props['estado'])}>
          <option value="todos">Todos</option>
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
        </select>
      </label>

      <span className="prv-conteo">{visibles} de {total}</span>
    </div>
  )
}

export default BarraProveedores
