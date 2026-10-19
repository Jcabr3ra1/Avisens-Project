import { IcChevronDown } from '@shared/ui/icons/icons'
import type { Alerta } from '../api/alertas'
import type { FiltrosAlertas as Filtros } from '../model/alerta'

interface FiltrosAlertasProps {
  alertas: Alerta[]
  filtros: Filtros
  onCambiar: (filtros: Filtros) => void
  onLimpiar: () => void
}

function FiltrosAlertas({ alertas, filtros, onCambiar, onLimpiar }: FiltrosAlertasProps) {
  const galpones = [...new Map(alertas.map((alerta) => [alerta.galpon_id, alerta.galpon])).values()]
  const filtrando = filtros.estado !== 'todas' || filtros.criticidad !== 'todas' || filtros.galponId !== 'todos'

  return (
    <section className="ale-filtros" aria-label="Filtrar alertas">
      <label className="ale-filtro">
        <span>Estado</span>
        <span className="ale-selector">
          <select value={filtros.estado} onChange={(event) => onCambiar({ ...filtros, estado: event.target.value as Filtros['estado'] })}>
            <option value="todas">Todos</option>
            <option value="abierta">Por atender</option>
            <option value="en_proceso">En atención</option>
            <option value="cerrada">Cerradas</option>
          </select>
          <IcChevronDown size={16} aria-hidden="true" />
        </span>
      </label>
      <label className="ale-filtro">
        <span>Prioridad</span>
        <span className="ale-selector">
          <select value={filtros.criticidad} onChange={(event) => onCambiar({ ...filtros, criticidad: event.target.value as Filtros['criticidad'] })}>
            <option value="todas">Todas</option>
            <option value="alta">Crítica</option>
            <option value="media">Atención</option>
            <option value="baja">Informativa</option>
          </select>
          <IcChevronDown size={16} aria-hidden="true" />
        </span>
      </label>
      <label className="ale-filtro">
        <span>Galpón</span>
        <span className="ale-selector">
          <select value={filtros.galponId} onChange={(event) => onCambiar({ ...filtros, galponId: event.target.value })}>
            <option value="todos">Todos los galpones</option>
            {galpones.map((galpon) => <option key={galpon.id} value={galpon.id}>{galpon.nombre} · {galpon.granja.nombre}</option>)}
          </select>
          <IcChevronDown size={16} aria-hidden="true" />
        </span>
      </label>
      {filtrando && <button type="button" className="ale-limpiar" onClick={onLimpiar}>Limpiar filtros</button>}
    </section>
  )
}

export default FiltrosAlertas
