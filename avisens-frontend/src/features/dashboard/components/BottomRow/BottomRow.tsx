// BottomRow.tsx — Fila inferior del dashboard con 3 cards:
// 1. Alertas activas (con puntos pulsantes rojo/amarillo)
// 2. Pendientes de hoy (tareas programadas con hora y responsable)
// 3. ¿Cómo están las aves? (sparkline de bienestar últimos 10 días)
import { Sparkline } from '../charts/charts'
import { Card } from '../primitives/primitives'
import { IcAlert, IcCal, IcHeart, IcChevronRight } from '@shared/ui/icons/icons'
import { wellbeingTrend } from '../../model'
import './BottomRow.css'

const BottomRow = () => (
  <div className="dash-bottom-row">
    <AlertasCard />
    <TareasCard />
    <BienestarCard />
  </div>
)

const AlertasCard = () => (
  <Card style={{ padding: 16 }} id="dash-section-alertas">
    <div className="dash-bottom-head">
      <div className="dash-bottom-icon" style={{ background: 'rgba(239, 68, 68, 0.12)', color: 'var(--red)' }}>
        <IcAlert size={16} />
      </div>
      <div>
        <div className="dash-bottom-title">Alertas activas</div>
        <div className="dash-bottom-sub">2 por atender</div>
      </div>
      <button className="mini-btn dash-bottom-cta">
        Ver todas <IcChevronRight size={11} />
      </button>
    </div>
    <AlertItem severity="high" label="Temperatura alta en la zona del centro" time="15 min" />
    <AlertItem severity="med" label="Humedad por encima de lo normal" time="42 min" />
  </Card>
)

const TareasCard = () => (
  <Card style={{ padding: 16 }} id="dash-section-tareas">
    <div className="dash-bottom-head">
      <div className="dash-bottom-icon" style={{ background: 'rgba(59, 130, 246, 0.12)', color: 'var(--info)' }}>
        <IcCal size={16} />
      </div>
      <div>
        <div className="dash-bottom-title">Pendientes de hoy</div>
        <div className="dash-bottom-sub">3 tareas programadas</div>
      </div>
      <button className="mini-btn dash-bottom-cta">
        Calendario <IcChevronRight size={11} />
      </button>
    </div>
    <TaskItem label="Revisar los bebederos" time="Hoy 14:00" owner="Carlos M." />
    <TaskItem label="Pesaje semanal del lote" time="Mañana 08:00" owner="Andrea P." />
  </Card>
)

const BienestarCard = () => (
  <Card style={{ padding: 16 }} id="dash-section-bienestar">
    <div className="dash-bottom-head">
      <div className="dash-bottom-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'var(--green-d)' }}>
        <IcHeart size={16} />
      </div>
      <div>
        <div className="dash-bottom-title">¿Cómo están las aves?</div>
        <div className="dash-bottom-sub" style={{ color: 'var(--green-d)' }}>Bien · sin estrés por calor</div>
      </div>
      <button className="mini-btn dash-bottom-cta">
        Detalles <IcChevronRight size={11} />
      </button>
    </div>
    <div className="dash-wellbeing-label">Bienestar del lote (últimos 10 días)</div>
    <Sparkline data={wellbeingTrend} w={290} h={42} color="#10b981" fill="rgba(16, 185, 129, 0.18)" />
  </Card>
)

const AlertItem = ({ severity, label, time }: { severity: 'high' | 'med'; label: string; time: string }) => {
  const colors = { high: '#ef4444', med: '#f59e0b' }
  return (
    <div className="dash-list-item">
      <span className="dash-list-pulse">
        <span className="dot" style={{ background: colors[severity] }} />
        {severity === 'high' && <span className="ring" style={{ borderColor: colors[severity] }} />}
      </span>
      <span className="dash-list-label">{label}</span>
      <span className="mono dash-list-time">hace {time}</span>
    </div>
  )
}

const TaskItem = ({ label, time, owner }: { label: string; time: string; owner: string }) => (
  <div className="dash-list-item">
    <span className="dash-task-checkbox" />
    <div className="dash-task-body">
      <div className="dash-task-label">{label}</div>
      <div className="dash-task-owner">{owner}</div>
    </div>
    <span className="mono dash-list-time">{time}</span>
  </div>
)

export default BottomRow
