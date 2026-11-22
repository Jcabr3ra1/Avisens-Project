import type { RefObject } from 'react'
import { IcChevronDown, IcClose, IcSearch } from '@shared/ui/icons/icons'
import type { FiltroEstadoUsuario } from '../hooks/useFiltroUsuarios'

type Props = {
  buscadorRef: RefObject<HTMLInputElement | null>
  busqueda: string
  visibles: number
  total: number
  esPropietario: boolean
  estadoFiltro: FiltroEstadoUsuario
  hayFiltros: boolean
  onBuscar: (texto: string) => void
  onCambiarEstado: (estado: FiltroEstadoUsuario) => void
  onLimpiar: () => void
}

function BarraUsuarios({
  buscadorRef,
  busqueda,
  visibles,
  total,
  esPropietario,
  estadoFiltro,
  hayFiltros,
  onBuscar,
  onCambiarEstado,
  onLimpiar,
}: Props) {
  return (
    <div className="usuarios-toolbar">
      <label className="usuarios-search">
        <IcSearch size={16} aria-hidden="true" />
        <span className="usuarios-sr-only">Buscar personas</span>
        <input
          ref={buscadorRef}
          type="search"
          placeholder="Buscar por nombre, usuario, correo, cédula u organización…"
          value={busqueda}
          onChange={(evento) => onBuscar(evento.target.value)}
          autoComplete="off"
        />
        {busqueda ? (
          <button
            type="button"
            className="usuarios-limpiar-busqueda"
            onClick={() => onBuscar('')}
            aria-label="Limpiar búsqueda"
          >
            <IcClose size={13} aria-hidden="true" />
          </button>
        ) : (
          <kbd aria-hidden="true">/</kbd>
        )}
      </label>

      <div className="usuarios-toolbar-controles">
        {!esPropietario && (
          <label className="usuarios-desplegable">
            <span className="usuarios-sr-only">Filtrar por estado de acceso</span>
            <select
              value={estadoFiltro}
              onChange={(evento) => onCambiarEstado(evento.target.value as FiltroEstadoUsuario)}
            >
              <option value="todos">Estado: todos</option>
              <option value="activos">Estado: activos</option>
              <option value="inactivos">Estado: inactivos</option>
            </select>
            <IcChevronDown size={16} aria-hidden="true" />
          </label>
        )}

        <span className="usuarios-toolbar-count" aria-live="polite">
          {visibles} de {total}
        </span>

        {hayFiltros && (
          <button type="button" className="usuarios-filtro-limpiar" onClick={onLimpiar}>
            Limpiar <IcClose size={13} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}

export default BarraUsuarios
