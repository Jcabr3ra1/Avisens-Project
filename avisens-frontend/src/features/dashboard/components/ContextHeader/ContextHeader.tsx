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
  curva = 'Italcol — fase engorde',
  vsCurva = '+3.2%',
}: Props) => (
  <div className="dash-context-header">
    <div className="dash-context-header-main">
      <div className="dash-galpon-title-row">
        <h1 className="dash-galpon-title">{galpon.nombre.replace('Galpón ', '')}</h1>
        <span className="dash-galpon-code mono">{galpon.codigo}</span>
      </div>
      <div className="dash-context-header-meta">
        <span>{galpon.aves.toLocaleString('es-CO')} aves</span>
        <span className="dash-context-sep">·</span>
        <span className="mono">{loteId}</span>
        <span className="dash-context-sep">·</span>
        <span>{curva}</span>
      </div>
    </div>
    <div className="dash-context-header-side">
      <div className="dash-context-header-status">
        <span className="dash-status-pulse">
          <span className="dot" />
          <span className="ring" />
        </span>
        En línea · Día {galpon.dia}
      </div>
      <div className="dash-context-header-curve">
        <span className="dash-context-curve-label">vs. curva</span>
        <span className="dash-foot-positive mono">{vsCurva}</span>
      </div>
    </div>
  </div>
)

export default ContextHeader
