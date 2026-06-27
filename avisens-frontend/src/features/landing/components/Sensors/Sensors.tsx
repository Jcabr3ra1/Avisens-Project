// Sensors.tsx — Sección de sensores IoT de la landing page
// Muestra 6 variables ambientales del galpón con lenguaje campesino
// Tiene 3 estados: Óptimo (verde), Atención (amarillo), Crítico (rojo)
// Cada sensor muestra descripción en español del campo: "Las aves están cómodas"
import { useState } from 'react'
import Ic from '@shared/ui/Ic/Ic'
import { useFadeUp } from '@shared/hooks/useFadeUp'
import './Sensors.css'

type GalponState = 'ok' | 'warn' | 'crit'

const iconPaths = {
  temp: 'M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z',
  humid: 'M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C7 11.1 6 13 6 15a7 7 0 0 0 6 7Z',
  co2: ['M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83', 'M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83'],
  vent: ['M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0', 'M12 3a4.5 4.5 0 1 0 4.5 4.5A4.5 4.5 0 0 0 12 12M12 21a4.5 4.5 0 1 1-4.5-4.5A4.5 4.5 0 0 1 12 12'],
  nh3: 'M3 8h11a3 3 0 1 0-3-3M3 16h15a3 3 0 1 1-3 3M3 12h18',
  light: ['M12 12m-5 0a5 5 0 1 0 10 0 5 5 0 1 0-10 0', 'M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42'],
}

const profiles: Record<GalponState, Array<{ name: string; value: string; unit: string; range: [string, string]; status: string; icon: keyof typeof iconPaths; level: number; trend: number[]; desc: string }>> = {
  ok: [
    { name: 'Temperatura', value: '25.4', unit: '°C', range: ['22°C', '28°C'], status: 'Óptimo', icon: 'temp', level: 58, trend: [60, 55, 70, 65, 75, 80, 70, 85, 75, 78], desc: 'Las aves están cómodas' },
    { name: 'Humedad', value: '62', unit: '%', range: ['50%', '70%'], status: 'Óptimo', icon: 'humid', level: 60, trend: [55, 62, 58, 65, 60, 68, 72, 65, 60, 62], desc: 'Nivel ideal para el lote' },
    { name: 'CO₂', value: '2,200', unit: 'ppm', range: ['0', '3,000'], status: 'Óptimo', icon: 'co2', level: 73, trend: [50, 65, 60, 72, 68, 75, 80, 73, 70, 73], desc: 'Aire limpio en el galpón' },
    { name: 'Ventilación', value: '65', unit: '%', range: ['Off', 'Max'], status: 'Auto', icon: 'vent', level: 65, trend: [40, 55, 60, 50, 65, 70, 65, 68, 60, 65], desc: 'Extractores regulando solos' },
    { name: 'Amoníaco NH₃', value: '18', unit: 'ppm', range: ['0', '20 ppm'], status: 'Óptimo', icon: 'nh3', level: 60, trend: [55, 60, 58, 62, 55, 60, 65, 60, 58, 60], desc: 'Cama en buen estado' },
    { name: 'Iluminación', value: '680', unit: 'lux', range: ['0', '1,000'], status: 'Programada', icon: 'light', level: 68, trend: [20, 40, 70, 80, 75, 68, 60, 50, 35, 25], desc: 'Ciclo de luz activo' },
  ],
  warn: [
    { name: 'Temperatura', value: '29.1', unit: '°C', range: ['22°C', '28°C'], status: 'Atención', icon: 'temp', level: 86, trend: [58, 62, 68, 72, 78, 81, 84, 86, 88, 86], desc: 'Calor subiendo, aves jadean' },
    { name: 'Humedad', value: '74', unit: '%', range: ['50%', '70%'], status: 'Alta', icon: 'humid', level: 82, trend: [60, 62, 68, 70, 74, 78, 76, 82, 80, 82], desc: 'Cama se está humedeciendo' },
    { name: 'CO₂', value: '2,850', unit: 'ppm', range: ['0', '3,000'], status: 'Límite', icon: 'co2', level: 90, trend: [55, 62, 70, 76, 82, 88, 92, 90, 86, 90], desc: 'Aire pesado, ventilar pronto' },
    { name: 'Ventilación', value: '88', unit: '%', range: ['Off', 'Max'], status: 'Auto', icon: 'vent', level: 88, trend: [45, 58, 66, 74, 80, 86, 90, 88, 84, 88], desc: 'Extractores al máximo esfuerzo' },
    { name: 'Amoníaco NH₃', value: '19', unit: 'ppm', range: ['0', '20 ppm'], status: 'Vigilar', icon: 'nh3', level: 76, trend: [48, 54, 60, 68, 70, 74, 78, 76, 74, 76], desc: 'Cama necesita volteo' },
    { name: 'Iluminación', value: '620', unit: 'lux', range: ['0', '1,000'], status: 'Programada', icon: 'light', level: 62, trend: [25, 42, 66, 78, 72, 62, 58, 48, 36, 28], desc: 'Ciclo de luz activo' },
  ],
  crit: [
    { name: 'Temperatura', value: '32.6', unit: '°C', range: ['22°C', '28°C'], status: 'Crítico', icon: 'temp', level: 96, trend: [64, 70, 78, 82, 88, 92, 96, 98, 96, 96], desc: 'Peligro de estrés calórico' },
    { name: 'Humedad', value: '81', unit: '%', range: ['50%', '70%'], status: 'Crítico', icon: 'humid', level: 92, trend: [66, 70, 74, 80, 86, 90, 94, 92, 91, 92], desc: 'Riesgo de enfermedades' },
    { name: 'CO₂', value: '3,460', unit: 'ppm', range: ['0', '3,000'], status: 'Crítico', icon: 'co2', level: 98, trend: [70, 76, 82, 88, 92, 96, 98, 99, 98, 98], desc: 'Aves en riesgo, actuar ya' },
    { name: 'Ventilación', value: '100', unit: '%', range: ['Off', 'Max'], status: 'Máxima', icon: 'vent', level: 100, trend: [58, 68, 78, 84, 90, 94, 100, 100, 100, 100], desc: 'Extractores al tope' },
    { name: 'Amoníaco NH₃', value: '27', unit: 'ppm', range: ['0', '20 ppm'], status: 'Crítico', icon: 'nh3', level: 95, trend: [60, 65, 72, 78, 84, 90, 95, 96, 94, 95], desc: 'Cambiar cama urgente' },
    { name: 'Iluminación', value: '520', unit: 'lux', range: ['0', '1,000'], status: 'Reducida', icon: 'light', level: 52, trend: [22, 38, 58, 66, 62, 52, 48, 40, 32, 24], desc: 'Luz reducida por estrés' },
  ],
}

const galponLabels: Record<GalponState, { name: string; birds: string }> = {
  ok: { name: 'Galpón 1', birds: '12,400 aves · Día 28' },
  warn: { name: 'Galpón 2', birds: '11,800 aves · Día 35' },
  crit: { name: 'Galpón 4', birds: '10,200 aves · Día 41' },
}

function Sensors() {
  const ref = useFadeUp()
  const [active, setActive] = useState<GalponState>('ok')
  const activeTone = active === 'ok' ? '' : active

  return (
    <section className="sensors-section" id="sensores">
      <div className="sensors-bg-deco" aria-hidden="true">
        <div className="sensors-bg-circle sensors-bg-circle--1" />
        <div className="sensors-bg-circle sensors-bg-circle--2" />
        <div className="sensors-bg-grain" />
      </div>

      <div className="max-w fade-up" ref={ref}>
        <div className="section-head center">
          <div className="section-label">Monitoreo del galpón</div>
          <h2 className="section-title">Sepa cómo están sus aves <span className="grad-text">sin pisar el galpón</span></h2>
          <p className="section-sub">Sensores IoT miden temperatura, humedad y calidad del aire cada minuto. Usted recibe alertas claras en su celular — antes de que un problema le cueste el lote.</p>
        </div>

        <div className="galpon-selector" aria-label="Estado por galpón">
          {(['ok', 'warn', 'crit'] as GalponState[]).map(state => (
            <button
              key={state}
              className={`galpon-btn ${active === state ? 'galpon-btn--active' : ''}`}
              data-state={state}
              type="button"
              onClick={() => setActive(state)}
            >
              <div className="galpon-btn__indicator" />
              <div className="galpon-btn__info">
                <span className="galpon-btn__name">{galponLabels[state].name}</span>
                <span className="galpon-btn__meta">{galponLabels[state].birds}</span>
              </div>
              <div className={`galpon-btn__badge galpon-btn__badge--${state}`}>
                {state === 'ok' ? 'Bien' : state === 'warn' ? 'Atención' : 'Crítico'}
              </div>
            </button>
          ))}
        </div>

        <div className="sensors-grid">
          {profiles[active].map((sensor, index) => (
            <article key={sensor.name} className={`sensor-card ${activeTone}${index === 0 ? ' sensor-card--hero' : ''}`}>
              <div className="sc-accent" />
              <div className="sc-header">
                <div className="sc-icon-wrap">
                  <Ic d={iconPaths[sensor.icon]} size={index === 0 ? 24 : 20} />
                </div>
                <div className="sc-badge">{sensor.status}</div>
              </div>
              <div className="sc-body">
                <div className="sc-label">{sensor.name}</div>
                <div className="sc-reading">{sensor.value}<span className="sc-unit">{sensor.unit}</span></div>
                <p className="sc-desc">{sensor.desc}</p>
              </div>
              <div className="sc-gauge">
                <div className="sc-gauge-labels"><span>{sensor.range[0]}</span><span>{sensor.range[1]}</span></div>
                <div className="sc-gauge-track">
                  <div className="sc-gauge-fill" style={{ width: `${sensor.level}%` }} />
                  <div className="sc-gauge-thumb" style={{ left: `${sensor.level}%` }} />
                </div>
              </div>
              <div className="sc-chart" aria-hidden="true">
                {sensor.trend.map((height, idx) => (
                  <div key={`${sensor.name}-${idx}`} className="sc-chart-bar" style={{ '--h': `${height}%` } as React.CSSProperties} />
                ))}
              </div>
            </article>
          ))}

          <article className="sensor-card sensor-card--cta">
            <div className="sc-cta-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
            </div>
            <div className="sc-cta-title">6 variables vigiladas 24/7</div>
            <p className="sc-cta-text">
              Cada sensor mide una vez por minuto. Usted duerme tranquilo sabiendo que AVISENS cuida su inversión.
            </p>
            <div className="sc-cta-stats">
              <div className="sc-cta-stat">
                <span className="sc-cta-num">1,440</span>
                <span className="sc-cta-label">lecturas/día por sensor</span>
              </div>
              <div className="sc-cta-stat">
                <span className="sc-cta-num">&lt;30s</span>
                <span className="sc-cta-label">para alertarlo</span>
              </div>
            </div>
          </article>
        </div>

        <p className="sensors-footer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Datos protegidos · Funciona con ESP32 y sensores de bajo costo · Sin internet el sensor guarda y reenvía
        </p>
      </div>
    </section>
  )
}

export default Sensors
