import { IcClose, IcSearch } from '@shared/ui/icons/icons'
import type { FiltroCanal } from '../hooks/useFiltroProspectos'

type Props = {
  busqueda: string
  onBuscar: (texto: string) => void
  filtroCanal: FiltroCanal
  onCambiarCanal: (canal: FiltroCanal) => void
}

function BarraHerramientas({
  busqueda,
  onBuscar,
  filtroCanal,
  onCambiarCanal,
}: Props) {
  return (
    <div className="crm-toolbar">
      <div className="crm-search">
        <IcSearch size={14} className="crm-search-icon" />
        <input
          aria-label="Buscar prospectos"
          className="crm-search-input"
          placeholder="Buscar prospecto, granja o municipio…"
          value={busqueda}
          onChange={(e) => onBuscar(e.target.value)}
        />
        {busqueda && (
          <button
            type="button"
            className="crm-search-clear"
            onClick={() => onBuscar('')}
            aria-label="Limpiar búsqueda"
          >
            <IcClose size={13} />
          </button>
        )}
      </div>

      <label className="crm-canal-filtro" htmlFor="crm-canal">
        <span>Origen</span>
        <select
          id="crm-canal"
          value={filtroCanal}
          onChange={(event) => onCambiarCanal(event.target.value as FiltroCanal)}
        >
          <option value="todos">Todos</option>
          <option value="web">Web</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
      </label>
    </div>
  )
}

export default BarraHerramientas
