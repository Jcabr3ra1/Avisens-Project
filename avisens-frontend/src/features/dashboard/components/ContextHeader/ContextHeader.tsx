// ContextHeader.tsx — Encabezado del galpón seleccionado
// Muestra: nombre grande, aves, lote, curva Italcol, KPIs (día, vs curva, alertas, sensores)
// Tiene punto verde pulsante que indica "Viendo el galpón ahora mismo"
import type { Galpon } from '../../model'
import './ContextHeader.css'

type Props = {
  galpon: Galpon
  loteId?: string
  curva?: string
  vsCurva?: string
}

const ContextHeader = ({
  galpon,
  loteId = 'L-2026-08',
  curva = 'Italcol · engorde',
  vsCurva = '+3.2%',
}: Props) => (
  <div className="dash-context-header">
    <div className="dash-context-copy">
      <div className="dash-context-eyebrow">
        <span className="dash-status-pulse">
          <span className="dot" />
          <span className="ring" />
        </span>
        Viendo el galpón ahora mismo
      </div>
      <div className="dash-galpon-title-row">
        <h1 className="dash-galpon-title">{galpon.nombre.replace(/^Galp\S+\s/, '')}</h1>
        <span className="dash-galpon-code mono">{galpon.codigo}</span>
      </div>
      <div className="dash-context-header-meta">
        <span>{galpon.aves.toLocaleString('es-CO')} aves</span>
        <span className="dash-context-sep">·</span>
        <span>Lote <span className="mono">{loteId}</span></span>
        <span className="dash-context-sep">·</span>
        <span>Curva {curva}</span>
      </div>
    </div>

    <div className="dash-context-kpis" aria-label="Indicadores del galpón">
      <div className="dash-context-kpi">
        <span className="dash-context-kpi-label">Día del lote</span>
        <strong className="mono">{galpon.dia}</strong>
      </div>
      <div className="dash-context-kpi">
        <span className="dash-context-kpi-label">Vs. curva Italcol</span>
        <strong className="mono positive">{vsCurva}</strong>
      </div>
      <div className="dash-context-kpi">
        <span className="dash-context-kpi-label">Alertas</span>
        <strong className="mono warning">{galpon.alertas > 0 ? `${galpon.alertas} por atender` : 'Todo bien'}</strong>
      </div>
      <div className="dash-context-kpi">
        <span className="dash-context-kpi-label">Sensores</span>
        <strong className="mono">Conectados</strong>
      </div>
    </div>
  </div>
)

export default ContextHeader
