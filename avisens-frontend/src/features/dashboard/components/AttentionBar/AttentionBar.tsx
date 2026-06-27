// AttentionBar.tsx — Barra de atención del dashboard
// Resume qué necesita atención hoy: alertas, tareas, mortalidad, bienestar
// Cada chip es clickable y salta a la sección correspondiente
// Textos campesinos: "Hay cosas pendientes", "las aves están bien"
import type { ReactNode } from 'react'
import { IcAlert, IcCal, IcHeart, IcSparkle, IcChevronRight } from '@shared/ui/icons/icons'
import type { Tone } from '../../model'
import './AttentionBar.css'

type AttentionBarProps = {
  alertas: number
  tareasHoy: number
  mortalidad: string
  mortalidadTrend: 'up' | 'down' | 'flat'
  bienestar: number
  onJump: (id: string) => void
}

const AttentionBar = ({ alertas, tareasHoy, mortalidad, mortalidadTrend, bienestar, onJump }: AttentionBarProps) => {
  const allClear = alertas === 0
  const mortalidadHigh = parseFloat(mortalidad) >= 2
  const bienestarTone: Tone = bienestar >= 75 ? 'ok' : bienestar >= 60 ? 'warning' : 'danger'

  return (
    <div className={`dash-attention-bar${allClear ? ' all-clear' : ''}`}>
      <div className="dash-attention-bar-label">
        <span className="dash-attention-bar-dot" />
        {allClear ? 'Todo en orden hoy' : 'Hay cosas pendientes'}
      </div>
      <div className="dash-attention-chips">
        <AttentionChip
          tone={alertas > 0 ? 'danger' : 'ok'}
          icon={<IcAlert size={14} />}
          value={alertas}
          label={alertas === 1 ? 'alerta activa' : 'alertas activas'}
          meta={alertas > 0 ? '1 urgente / 1 moderada' : 'todo tranquilo'}
          onClick={() => onJump('dash-section-alertas')}
        />
        <AttentionChip
          tone="info"
          icon={<IcCal size={14} />}
          value={tareasHoy}
          label="tareas hoy"
          meta="la próxima a las 14:00"
          onClick={() => onJump('dash-section-tareas')}
        />
        <AttentionChip
          tone={mortalidadHigh ? 'warning' : 'ok'}
          icon={<IcHeart size={14} />}
          value={mortalidad}
          label="mortalidad"
          meta={mortalidadTrend === 'up' ? 'subió desde ayer' : mortalidadTrend === 'down' ? 'bajó desde ayer' : 'igual que ayer'}
          onClick={() => onJump('dash-section-estado')}
        />
        <AttentionChip
          tone={bienestarTone}
          icon={<IcSparkle size={14} />}
          value={bienestar}
          label="bienestar"
          meta={bienestar >= 75 ? 'las aves están bien' : bienestar >= 60 ? 'revisar condiciones' : 'aves estresadas'}
          onClick={() => onJump('dash-section-bienestar')}
        />
      </div>
    </div>
  )
}

type AttentionChipProps = {
  tone: Tone
  icon: ReactNode
  value: string | number
  label: string
  meta?: string
  onClick?: () => void
}

const AttentionChip = ({ tone, icon, value, label, meta, onClick }: AttentionChipProps) => (
  <button
    type="button"
    className={`dash-attention-chip dash-attention-chip--${tone}`}
    onClick={onClick}
  >
    <span className="dash-attention-chip-icon">{icon}</span>
    <span className="dash-attention-chip-body">
      <span className="dash-attention-chip-line">
        <span className="dash-attention-chip-value mono">{value}</span>
        <span className="dash-attention-chip-label">{label}</span>
      </span>
      {meta && <span className="dash-attention-chip-meta">{meta}</span>}
    </span>
    <span className="dash-attention-chip-arrow">
      <IcChevronRight size={11} />
    </span>
  </button>
)

export default AttentionBar
