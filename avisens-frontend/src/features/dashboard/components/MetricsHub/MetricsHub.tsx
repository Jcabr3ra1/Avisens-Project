import { IcFan } from '../icons/icons'
import { BarChart, AreaChart, RadialGauge } from '../charts/charts'
import { METRIC_TABS, TONE_HEX, TONE_VAR, TONE_LABEL } from '../../model'
import type { MetricId, MetricTab, Tone } from '../../model'
import './MetricsHub.css'

type VentMode = 'Auto' | 'Manual' | 'Apagado'

type MetricsHubProps = {
  active: MetricId
  setActive: (id: MetricId) => void
  ventSpeed: number
  setVentSpeed: (v: number) => void
  ventMode: VentMode
  setVentMode: (m: VentMode) => void
}

const MetricsHub = ({ active, setActive, ventSpeed, setVentSpeed, ventMode, setVentMode }: MetricsHubProps) => {
  const tab = METRIC_TABS.find((m) => m.id === active)!

  return (
    <div className="dash-metrics-hub">
      <div className="dash-metrics-hub-tabs" role="tablist" aria-label="Métricas">
        {METRIC_TABS.map((m) => {
          const on = m.id === active
          const displayValue = m.id === 'vent' ? String(ventSpeed) : m.value
          return (
            <button
              key={m.id}
              role="tab"
              aria-selected={on}
              onClick={() => setActive(m.id)}
              className={`dash-metrics-hub-tab${on ? ' active' : ''}`}
              style={{ ['--tab-accent' as string]: m.categoryColor } as React.CSSProperties}
            >
              <span className="dash-metrics-hub-tab-icon">{m.icon}</span>
              <span className="dash-metrics-hub-tab-text">
                <span className="dash-metrics-hub-tab-short">{m.short}</span>
                <span className="dash-metrics-hub-tab-val mono">
                  {displayValue}
                  <span className="dash-metrics-hub-tab-unit">{m.unit}</span>
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="dash-metrics-hub-body" role="tabpanel" key={tab.id}>
        {tab.id === 'vent' ? (
          <VentilacionBody
            speed={ventSpeed}
            setSpeed={setVentSpeed}
            mode={ventMode}
            setMode={setVentMode}
          />
        ) : (
          <MetricDetail tab={tab} />
        )}
      </div>
    </div>
  )
}

const MetricDetail = ({ tab }: { tab: MetricTab }) => {
  const data = tab.data ?? []
  const min = data.length ? Math.min(...data).toFixed(0) : '—'
  const max = data.length ? Math.max(...data).toFixed(0) : '—'
  const prom = data.length ? (data.reduce((a, b) => a + b, 0) / data.length).toFixed(0) : '—'

  const chartHex = TONE_HEX[tab.tone]
  const valueColorVar = tab.tone === 'ok' || tab.tone === 'neutral' ? 'var(--text)' : TONE_VAR[tab.tone]
  const statusLabel = tab.status ?? TONE_LABEL[tab.tone]

  return (
    <>
      <div className="dash-metrics-hub-head">
        <div>
          <div className="dash-metrics-hub-title">{tab.label}</div>
          <div className="dash-metrics-hub-sub">{tab.sub}</div>
        </div>
        <StatusPill tone={tab.tone}>{statusLabel}</StatusPill>
      </div>

      <div className="dash-metrics-hub-value-row">
        <div className="dash-metrics-hub-value-block">
          <span className="dash-metrics-hub-value mono" style={{ color: valueColorVar }}>{tab.value}</span>
          <span className="dash-metrics-hub-unit">{tab.unit}</span>
        </div>
        <div className="dash-metrics-hub-stats">
          <HubStat label="Mín"  value={`${min}${tab.unit}`} />
          <HubStat label="Prom" value={`${prom}${tab.unit}`} />
          <HubStat label="Máx"  value={`${max}${tab.unit}`} />
        </div>
      </div>

      <div className="dash-metrics-hub-chart">
        {tab.chartType === 'bar' ? (
          <BarChart  data={data} w={1000} h={200} color={chartHex} yTicks={tab.yTicks} />
        ) : (
          <AreaChart data={data} w={1000} h={200} color={chartHex} yTicks={tab.yTicks} />
        )}
      </div>
    </>
  )
}

const HubStat = ({ label, value }: { label: string; value: string }) => (
  <div className="dash-metrics-hub-stat">
    <div className="dash-metrics-hub-stat-label">{label}</div>
    <div className="dash-metrics-hub-stat-value mono">{value}</div>
  </div>
)

const StatusPill = ({ tone, children }: { tone: Tone; children: React.ReactNode }) => (
  <span
    className="dash-metrics-hub-status"
    data-tone={tone}
    style={{ color: TONE_VAR[tone] }}
  >
    {children}
  </span>
)

type VentilacionBodyProps = {
  speed: number
  setSpeed: (v: number) => void
  mode: VentMode
  setMode: (m: VentMode) => void
}

const VentilacionBody = ({ speed, setSpeed, mode, setMode }: VentilacionBodyProps) => {
  const tone: Tone = mode === 'Apagado' ? 'neutral' : 'info'
  return (
    <>
      <div className="dash-metrics-hub-head">
        <div>
          <div className="dash-metrics-hub-title">Ventilación</div>
          <div className="dash-metrics-hub-sub">Modo {mode.toLowerCase()} · 6 fans · zona única</div>
        </div>
        <StatusPill tone={tone}>{mode}</StatusPill>
      </div>

      <div className="dash-vent-hub">
        <div className="dash-vent-hub-left">
          <div className="dash-vent-gauge dash-vent-gauge-lg">
            <RadialGauge value={speed} max={100} size={140} color="var(--text)" track="rgba(10, 26, 20, 0.08)" />
            <div
              className="dash-vent-fan"
              style={{ animation: speed > 0 ? `dash-fanspin ${Math.max(0.5, 6 - speed / 20)}s linear infinite` : 'none' }}
            >
              <IcFan size={42} />
            </div>
          </div>
          <div className="dash-vent-hub-readout">
            <div className="mono dash-vent-hub-value">
              {speed}<span className="dash-vent-hub-unit">%</span>
            </div>
            <div className="dash-vent-hub-label">Velocidad actual</div>
          </div>
        </div>

        <div className="dash-vent-hub-right">
          <div className="dash-vent-hub-section-label">Modo de operación</div>
          <div className="dash-vent-modes">
            {(['Auto', 'Manual', 'Apagado'] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m)
                  if (m === 'Apagado') setSpeed(0)
                  else if (m === 'Auto') setSpeed(60)
                  else setSpeed(70)
                }}
                className={`dash-vent-mode${m === mode ? ' active' : ''}`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="dash-vent-hub-section-label">Velocidad manual</div>
          <input
            type="range"
            min={0}
            max={100}
            value={speed}
            onChange={(e) => {
              setSpeed(Number(e.target.value))
              if (mode !== 'Manual') setMode('Manual')
            }}
            className="dash-vent-slider"
            aria-label="Velocidad de ventilación"
          />
          <div className="dash-vent-hub-stats">
            <HubStat label="Consumo" value="1.4 kW" />
            <HubStat label="Caudal"  value="62 m³/h" />
            <HubStat label="Última"  value="hace 2s" />
          </div>
        </div>
      </div>
    </>
  )
}

export default MetricsHub
