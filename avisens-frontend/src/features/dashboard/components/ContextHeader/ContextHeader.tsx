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
  curva = 'Italcol - fase engorde',
  vsCurva = '+3.2%',
}: Props) => (
  <div className="dash-context-header">
    <div className="dash-context-copy">
      <div className="dash-context-eyebrow">
        <span className="dash-status-pulse">
          <span className="dot" />
          <span className="ring" />
        </span>
        Centro de control en vivo
      </div>
      <div className="dash-galpon-title-row">
        <h1 className="dash-galpon-title">{galpon.nombre.replace(/^Galp\S+\s/, '')}</h1>
        <span className="dash-galpon-code mono">{galpon.codigo}</span>
      </div>
      <div className="dash-context-header-meta">
        <span>{galpon.aves.toLocaleString('es-CO')} aves</span>
        <span className="dash-context-sep">/</span>
        <span className="mono">{loteId}</span>
        <span className="dash-context-sep">/</span>
        <span>{curva}</span>
      </div>
    </div>

    <div className="dash-context-kpis" aria-label="Indicadores del galpon">
      <div className="dash-context-kpi">
        <span className="dash-context-kpi-label">Dia del lote</span>
        <strong className="mono">{galpon.dia}</strong>
      </div>
      <div className="dash-context-kpi">
        <span className="dash-context-kpi-label">Vs. curva</span>
        <strong className="mono positive">{vsCurva}</strong>
      </div>
      <div className="dash-context-kpi">
        <span className="dash-context-kpi-label">Riesgo</span>
        <strong className="mono warning">{galpon.alertas > 0 ? `${galpon.alertas} alertas` : 'Bajo'}</strong>
      </div>
      <div className="dash-context-kpi">
        <span className="dash-context-kpi-label">Sync</span>
        <strong className="mono">2s</strong>
      </div>
    </div>
  </div>
)

export default ContextHeader
