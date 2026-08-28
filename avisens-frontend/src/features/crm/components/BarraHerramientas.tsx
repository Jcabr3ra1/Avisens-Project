import { IcClose, IcGrid, IcSearch, IcUsers } from '@shared/ui/icons/icons'
import type { Vista } from '../hooks/useFiltroProspectos'

type Props = {
  busqueda: string
  onBuscar: (texto: string) => void
  vista: Vista
  onCambiarVista: (vista: Vista) => void
}

function BarraHerramientas({ busqueda, onBuscar, vista, onCambiarVista }: Props) {
  return (
    <div className="crm-toolbar">
      <div className="crm-search">
        <IcSearch size={14} className="crm-search-icon" />
        <input
          className="crm-search-input"
          placeholder="Buscar prospecto, granja o municipio…"
          value={busqueda}
          onChange={(e) => onBuscar(e.target.value)}
        />
        {busqueda && (
          <button
            className="crm-search-clear"
            onClick={() => onBuscar('')}
            aria-label="Limpiar búsqueda"
          >
            <IcClose size={13} />
          </button>
        )}
      </div>

      <div className="crm-vista-toggle">
        <button
          className={`crm-vista-btn${vista === 'kanban' ? ' crm-vista-btn--activo' : ''}`}
          onClick={() => onCambiarVista('kanban')}
        >
          <IcGrid size={14} /> Kanban
        </button>
        <button
          className={`crm-vista-btn${vista === 'tabla' ? ' crm-vista-btn--activo' : ''}`}
          onClick={() => onCambiarVista('tabla')}
        >
          <IcUsers size={14} /> Lista
        </button>
      </div>
    </div>
  )
}

export default BarraHerramientas
