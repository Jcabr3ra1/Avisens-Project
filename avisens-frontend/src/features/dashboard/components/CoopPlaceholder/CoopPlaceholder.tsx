import type { ReactNode } from 'react'
import { IcThermo, IcDrop, IcFan, IcSeed } from '../icons/icons'
import type { Galpon } from '../../model'
import './CoopPlaceholder.css'

const CoopPlaceholder = ({ galpon }: { galpon: Galpon }) => (
  <div className="dash-coop-placeholder">
    <div className="dash-coop-ambient" />
    <div className="dash-coop-grid" />

    <div className="dash-coop-content">
      <div className="dash-coop-emoji">🐔</div>
      <div className="dash-coop-title">{galpon.nombre}</div>
      <div className="dash-coop-meta">
        {galpon.status === 'empty' ? 'Sin lote activo' : `${galpon.aves.toLocaleString('es-CO')} aves · día ${galpon.dia}`}
      </div>
      <div className="dash-coop-hint">Vista 3D próximamente</div>

      <div className="dash-coop-sensors">
        <CoopSensorChip icon={<IcThermo size={14} />} label="Temp."   value="27.4°C" color="var(--amber)" />
        <CoopSensorChip icon={<IcDrop   size={14} />} label="Humedad" value="58%"    color="var(--info)" />
        <CoopSensorChip icon={<IcFan    size={14} />} label="Vent."   value="60%"    color="var(--text2)" />
        <CoopSensorChip icon={<IcSeed   size={14} />} label="Alim."   value="245 kg" color="var(--green-d)" />
      </div>
    </div>

    <div className="dash-coop-foot">
      <div className="dash-coop-modes">
        {['2D', '3D', 'Térmico'].map((v, i) => (
          <button key={v} className={`dash-coop-mode${i === 1 ? ' active' : ''}`}>
            {v}
          </button>
        ))}
      </div>
      <div className="dash-coop-live">
        <span className="dash-list-pulse">
          <span className="dot" style={{ background: '#ef4444' }} />
          <span className="ring" style={{ borderColor: '#ef4444' }} />
        </span>
        <span className="mono">LIVE</span>
        <span className="dash-coop-live-time">· hace 2s</span>
      </div>
    </div>
  </div>
)

const CoopSensorChip = ({
  icon, label, value, color,
}: {
  icon: ReactNode
  label: string
  value: string
  color: string
}) => (
  <div className="dash-coop-chip">
    <div className="dash-coop-chip-icon" style={{ color }}>{icon}</div>
    <div className="dash-coop-chip-text">
      <div className="dash-coop-chip-label">{label}</div>
      <div className="mono dash-coop-chip-value" style={{ color }}>{value}</div>
    </div>
  </div>
)

export default CoopPlaceholder
