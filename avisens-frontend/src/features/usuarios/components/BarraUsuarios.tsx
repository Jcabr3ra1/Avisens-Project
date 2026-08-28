import { IcSearch } from '@shared/ui/icons/icons'

type Props = {
  busqueda: string
  visibles: number
  total: number
  onBuscar: (texto: string) => void
}

function BarraUsuarios({ busqueda, visibles, total, onBuscar }: Props) {
  return (
    <div className="usuarios-toolbar">
      <label className="usuarios-search">
        <IcSearch size={15} />
        <span className="usuarios-sr-only">Buscar usuarios</span>
        <input
          type="search"
          placeholder="Buscar por nombre, correo o cédula…"
          value={busqueda}
          onChange={(evento) => onBuscar(evento.target.value)}
        />
      </label>
      <span className="usuarios-toolbar-count" aria-live="polite">
        {visibles} de {total}
      </span>
    </div>
  )
}

export default BarraUsuarios
