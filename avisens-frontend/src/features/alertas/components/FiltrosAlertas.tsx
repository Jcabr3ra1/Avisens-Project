import type { Alerta } from '../api/alertas'
import type { FiltrosAlertas as Filtros } from '../model/alerta'

interface FiltrosAlertasProps {
  alertas: Alerta[]
  filtros: Filtros
  onCambiar: (filtros: Filtros) => void
  onRecargar: () => void
  cargando: boolean
}

function FiltrosAlertas({ alertas, filtros, onCambiar, onRecargar, cargando }: FiltrosAlertasProps) {
  const galpones = [...new Map(alertas.map((alerta) => [alerta.galpon_id, alerta.galpon])).values()]

  return (
    <section className="ale-filtros" aria-label="Filtrar alertas">
      <label>
        Estado
        <select value={filtros.estado} onChange={(event) => onCambiar({ ...filtros, estado: event.target.value as Filtros['estado'] })}>
          <option value="todas">Todos</option>
          <option value="abierta">Por atender</option>
          <option value="en_proceso">En atención</option>
          <option value="cerrada">Cerradas</option>
        </select>
      </label>
      <label>
        Prioridad
        <select value={filtros.criticidad} onChange={(event) => onCambiar({ ...filtros, criticidad: event.target.value as Filtros['criticidad'] })}>
          <option value="todas">Todas</option>
          <option value="alta">Crítica</option>
          <option value="media">Atención</option>
          <option value="baja">Informativa</option>
        </select>
      </label>
      <label>
        Galpón
        <select value={filtros.galponId} onChange={(event) => onCambiar({ ...filtros, galponId: event.target.value })}>
          <option value="todos">Todos los galpones</option>
          {galpones.map((galpon) => <option key={galpon.id} value={galpon.id}>{galpon.nombre} · {galpon.granja.nombre}</option>)}
        </select>
      </label>
      <button type="button" className="ale-btn ale-btn--secundario" onClick={onRecargar} disabled={cargando}>
        {cargando ? 'Actualizando…' : 'Actualizar'}
      </button>
    </section>
  )
}

export default FiltrosAlertas
