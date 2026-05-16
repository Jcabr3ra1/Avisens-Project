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

const profiles: Record<GalponState, Array<{ name: string; value: string; unit: string; range: [string, string]; status: string; icon: keyof typeof iconPaths; level: number; trend: number[] }>> = {
  ok: [
    { name: 'Temperatura', value: '25.4', unit: '°C', range: ['22°C', '28°C'], status: 'Óptimo', icon: 'temp', level: 58, trend: [60, 55, 70, 65, 75, 80, 70, 85, 75, 78] },
    { name: 'Humedad', value: '62', unit: '%', range: ['50%', '70%'], status: 'Óptimo', icon: 'humid', level: 60, trend: [55, 62, 58, 65, 60, 68, 72, 65, 60, 62] },
    { name: 'CO₂', value: '2,200', unit: 'ppm', range: ['0', '3,000'], status: 'Óptimo', icon: 'co2', level: 73, trend: [50, 65, 60, 72, 68, 75, 80, 73, 70, 73] },
    { name: 'Ventilación', value: '65', unit: '%', range: ['Off', 'Max'], status: 'Auto', icon: 'vent', level: 65, trend: [40, 55, 60, 50, 65, 70, 65, 68, 60, 65] },
    { name: 'Amoníaco NH₃', value: '18', unit: 'ppm', range: ['0', '20 ppm'], status: 'Óptimo', icon: 'nh3', level: 60, trend: [55, 60, 58, 62, 55, 60, 65, 60, 58, 60] },
    { name: 'Iluminación', value: '680', unit: 'lux', range: ['0', '1,000'], status: 'Programada', icon: 'light', level: 68, trend: [20, 40, 70, 80, 75, 68, 60, 50, 35, 25] },
  ],
  warn: [
    { name: 'Temperatura', value: '29.1', unit: '°C', range: ['22°C', '28°C'], status: 'Atención', icon: 'temp', level: 86, trend: [58, 62, 68, 72, 78, 81, 84, 86, 88, 86] },
    { name: 'Humedad', value: '74', unit: '%', range: ['50%', '70%'], status: 'Alta', icon: 'humid', level: 82, trend: [60, 62, 68, 70, 74, 78, 76, 82, 80, 82] },
    { name: 'CO₂', value: '2,850', unit: 'ppm', range: ['0', '3,000'], status: 'Límite', icon: 'co2', level: 90, trend: [55, 62, 70, 76, 82, 88, 92, 90, 86, 90] },
    { name: 'Ventilación', value: '88', unit: '%', range: ['Off', 'Max'], status: 'Auto', icon: 'vent', level: 88, trend: [45, 58, 66, 74, 80, 86, 90, 88, 84, 88] },
    { name: 'Amoníaco NH₃', value: '19', unit: 'ppm', range: ['0', '20 ppm'], status: 'Vigilar', icon: 'nh3', level: 76, trend: [48, 54, 60, 68, 70, 74, 78, 76, 74, 76] },
    { name: 'Iluminación', value: '620', unit: 'lux', range: ['0', '1,000'], status: 'Programada', icon: 'light', level: 62, trend: [25, 42, 66, 78, 72, 62, 58, 48, 36, 28] },
  ],
  crit: [
    { name: 'Temperatura', value: '32.6', unit: '°C', range: ['22°C', '28°C'], status: 'Crítico', icon: 'temp', level: 96, trend: [64, 70, 78, 82, 88, 92, 96, 98, 96, 96] },
    { name: 'Humedad', value: '81', unit: '%', range: ['50%', '70%'], status: 'Crítico', icon: 'humid', level: 92, trend: [66, 70, 74, 80, 86, 90, 94, 92, 91, 92] },
    { name: 'CO₂', value: '3,460', unit: 'ppm', range: ['0', '3,000'], status: 'Crítico', icon: 'co2', level: 98, trend: [70, 76, 82, 88, 92, 96, 98, 99, 98, 98] },
    { name: 'Ventilación', value: '100', unit: '%', range: ['Off', 'Max'], status: 'Máxima', icon: 'vent', level: 100, trend: [58, 68, 78, 84, 90, 94, 100, 100, 100, 100] },
    { name: 'Amoníaco NH₃', value: '27', unit: 'ppm', range: ['0', '20 ppm'], status: 'Crítico', icon: 'nh3', level: 95, trend: [60, 65, 72, 78, 84, 90, 95, 96, 94, 95] },
    { name: 'Iluminación', value: '520', unit: 'lux', range: ['0', '1,000'], status: 'Reducida', icon: 'light', level: 52, trend: [22, 38, 58, 66, 62, 52, 48, 40, 32, 24] },
  ],
}

function Sensors() {
  const ref = useFadeUp()
  const [active, setActive] = useState<GalponState>('ok')
  const activeTone = active === 'ok' ? '' : active

  return (
    <section className="sensors-section" id="sensores">
      <div className="max-w fade-up" ref={ref}>
        <div className="section-head center">
          <div className="section-label">Lo que monitoreamos</div>
          <h2 className="section-title">Variables críticas <span className="grad-text">en tiempo real</span></h2>
          <p className="section-sub">Cada sensor IoT envía datos cada minuto. AVISENS los procesa, los compara con rangos óptimos y te avisa antes de que un problema escale.</p>
        </div>

        <div className="galpon-tabs" aria-label="Estado por galpón">
          {[
            ['ok', 'Galpón 1 · Óptimo'],
            ['warn', 'Galpón 2 · Atención'],
            ['crit', 'Galpón 4 · Crítico'],
          ].map(([state, label]) => (
            <button
              key={state}
              className={`galpon-tab ${active === state ? 'active' : ''}`}
              data-state={state}
              type="button"
              onClick={() => setActive(state as GalponState)}
            >
              <span className="gt-status" />
              {label}
            </button>
          ))}
        </div>

        <div className="sensors-grid">
          {profiles[active].map((sensor) => (
            <article key={sensor.name} className={`sensor-card ${activeTone}`}>
              <div className="sc-top">
                <div className="sc-icon"><Ic d={iconPaths[sensor.icon]} size={22} /></div>
                <div className="sc-status">{sensor.status}</div>
              </div>
              <div className="sc-name">{sensor.name}</div>
              <div className="sc-value">{sensor.value}<span className="unit">{sensor.unit}</span></div>
              <div className="sc-range"><span>{sensor.range[0]}</span><span>{sensor.range[1]}</span></div>
              <div className="sc-bar">
                <div className="sc-bar-fill" style={{ width: `${sensor.level}%` }} />
                <div className="sc-bar-marker" style={{ left: `${sensor.level}%` }} />
              </div>
              <div className="sc-spark" aria-hidden="true">
                {sensor.trend.map((height, index) => (
                  <div key={`${sensor.name}-${index}`} className="sc-spark-bar" style={{ height: `${height}%` }} />
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Sensors
