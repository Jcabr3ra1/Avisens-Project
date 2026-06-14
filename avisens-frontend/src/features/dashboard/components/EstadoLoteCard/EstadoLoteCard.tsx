import { Sparkline } from '../charts/charts'
import { Card, CardTitle, Row } from '../primitives/primitives'
import { IcRefresh } from '../icons/icons'
import { flockTrend } from '../../model'
import type { Galpon } from '../../model'
import './EstadoLoteCard.css'

const EstadoLoteCard = ({ galpon }: { galpon: Galpon }) => (
  <Card id="dash-section-estado">
    <CardTitle action={<button className="mini-btn" aria-label="Actualizar estado"><IcRefresh size={12} /></button>}>
      Estado del lote
    </CardTitle>
    <div className="dash-rows">
      <Row label="Edad" value={`${galpon.dia} dias`} />
      <Row label="Pollos" value={galpon.aves.toLocaleString('es-CO')} />
      <Row label="Mortalidad" value={<span style={{ color: 'var(--red)' }}>2.1 %</span>} />
      <Row label="Peso prom." value="1.42 kg" />
      <Row label="Lote" value={<span className="mono">L-2026-08</span>} />
    </div>
    <div className="dash-card-foot">
      <div className="dash-foot-row">
        <span className="dash-foot-label">Tendencia bienestar (10 dias)</span>
        <span className="dash-foot-positive mono">+80</span>
      </div>
      <Sparkline data={flockTrend} w={244} h={42} color="#10b981" fill="rgba(16, 185, 129, 0.18)" />
    </div>
  </Card>
)

export default EstadoLoteCard
