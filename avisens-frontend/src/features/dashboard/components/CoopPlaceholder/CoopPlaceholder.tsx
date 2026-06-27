// CoopPlaceholder.tsx — Galpón 3D isométrico interactivo
// Dibuja un galpón avícola en SVG isométrico basado en datos reales de Italcol, FENAVI y Aviagen:
// - Techo a dos aguas con caballete (ángulo 45°)
// - 6 extractores girando en la pared testero
// - Cortinas enrollables, malla de alambre, silo de alimento, tanque de agua
// - 3 zonas con mapa de calor (verde=bien, amarillo=atención)
// - 11 sensores clicables con inspector lateral
// - Se gira arrastrando el mouse o con botones ← →
// - Zoom con botones + / −
import { useState, useRef, useCallback } from 'react'
import type { ReactNode } from 'react'
import {
  IcAlert, IcDrop, IcFan, IcRefresh, IcSeed, IcSettings, IcThermo, IcWind, IcChevronRight, IcPlus,
} from '@shared/ui/icons/icons'
import type { Galpon } from '../../model'
import './CoopPlaceholder.css'

type DeviceStatus = 'ok' | 'warn' | 'crit' | 'info'
type SensorPoint = {
  id: string; label: string; type: 'temp' | 'humid' | 'fan' | 'food' | 'water' | 'access'
  zone: string; value: string; numValue: number; unit: string; status: DeviceStatus
  x: number; y: number; note: string; min: number; max: number; ideal: [number, number]
}

const SENSORS: SensorPoint[] = [
  { id: 't1', label: 'Temperatura', type: 'temp', zone: 'Zona 1 · Entrada', value: '28.4', numValue: 28.4, unit: '°C', status: 'ok', x: 22, y: 52, note: 'Temperatura estable, las aves están cómodas.', min: 20, max: 38, ideal: [25, 29] },
  { id: 't2', label: 'Temperatura', type: 'temp', zone: 'Zona 2 · Centro', value: '29.8', numValue: 29.8, unit: '°C', status: 'warn', x: 50, y: 50, note: 'Subió 1.4°C en 18 min. Hay que prender más ventiladores.', min: 20, max: 38, ideal: [25, 29] },
  { id: 't3', label: 'Temperatura', type: 'temp', zone: 'Zona 3 · Salida', value: '27.6', numValue: 27.6, unit: '°C', status: 'ok', x: 78, y: 52, note: 'Todo bien, dentro del rango para esta semana.', min: 20, max: 38, ideal: [25, 29] },
  { id: 'h1', label: 'Humedad', type: 'humid', zone: 'Zona 1', value: '60', numValue: 60, unit: '%', status: 'ok', x: 25, y: 65, note: 'La humedad está bien para esta etapa del lote.', min: 30, max: 90, ideal: [55, 65] },
  { id: 'h2', label: 'Humedad', type: 'humid', zone: 'Zona 2', value: '58', numValue: 58, unit: '%', status: 'ok', x: 60, y: 63, note: 'Nivel ideal, la cama está en buen estado.', min: 30, max: 90, ideal: [55, 65] },
  { id: 'f1', label: 'Extractor 1-2', type: 'fan', zone: 'Testero norte', value: '55', numValue: 55, unit: '%', status: 'ok', x: 15, y: 35, note: 'Funcionando normal, se regulan solos.', min: 0, max: 100, ideal: [40, 80] },
  { id: 'f2', label: 'Extractor 3-4', type: 'fan', zone: 'Testero norte', value: '72', numValue: 72, unit: '%', status: 'info', x: 50, y: 33, note: 'Velocidad aumentada por la temperatura del centro.', min: 0, max: 100, ideal: [40, 80] },
  { id: 'f3', label: 'Extractor 5-6', type: 'fan', zone: 'Testero norte', value: '60', numValue: 60, unit: '%', status: 'info', x: 85, y: 35, note: '6 extractores prendidos. Se regulan según temperatura.', min: 0, max: 100, ideal: [40, 80] },
  { id: 'fd', label: 'Comederos', type: 'food', zone: 'Línea central', value: '245', numValue: 245, unit: 'kg', status: 'ok', x: 36, y: 58, note: 'Las aves están comiendo bien, 2% más de lo esperado.', min: 0, max: 300, ideal: [200, 260] },
  { id: 'wt', label: 'Bebederos', type: 'water', zone: 'Línea central', value: '1,125', numValue: 1125, unit: 'L', status: 'ok', x: 68, y: 58, note: 'Están tomando bien el agua. No se detectan fugas.', min: 0, max: 1500, ideal: [900, 1200] },
  { id: 'ac', label: 'Puerta', type: 'access', zone: 'Entrada', value: 'Cerrada', numValue: 0, unit: '', status: 'info', x: 6, y: 55, note: 'Última vez que alguien entró fue hace 22 min.', min: 0, max: 1, ideal: [0, 0] },
]

const SL: Record<DeviceStatus, string> = { ok: 'Bien', warn: 'Atención', crit: 'Urgente', info: 'Monitoreo' }
const SC: Record<DeviceStatus, string> = { ok: '#10b981', warn: '#f59e0b', crit: '#ef4444', info: '#3b82f6' }
const ic = (t: SensorPoint['type'], s = 15): ReactNode => {
  const m = { temp: IcThermo, humid: IcDrop, fan: IcFan, food: IcSeed, water: IcDrop, access: IcWind }
  const C = m[t]; return <C size={s} />
}

const CoopPlaceholder = ({ galpon }: { galpon: Galpon }) => {
  const [activeId, setActiveId] = useState('t2')
  const active = SENSORS.find(s => s.id === activeId) ?? SENSORS[0]
  const gp = active.max > 0 ? Math.min(100, Math.max(0, ((active.numValue - active.min) / (active.max - active.min)) * 100)) : 0
  const iS = ((active.ideal[0] - active.min) / (active.max - active.min)) * 100
  const iE = ((active.ideal[1] - active.min) / (active.max - active.min)) * 100

  const [rotY, setRotY] = useState(0)
  const [zoom, setZoom] = useState(1)
  const drag = useRef(false)
  const lx = useRef(0)

  const onD = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.coop-point, .coop-ctrl')) return
    drag.current = true; lx.current = e.clientX
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [])
  const onM = useCallback((e: React.PointerEvent) => {
    if (!drag.current) return
    setRotY(r => Math.max(-40, Math.min(40, r + (e.clientX - lx.current) * 0.35)))
    lx.current = e.clientX
  }, [])
  const onU = useCallback(() => { drag.current = false }, [])

  return (
    <section className="coop">
      <div className="coop-header">
        <div>
          <div className="coop-kicker">Vista 3D del galpón</div>
          <h2 className="coop-title">{galpon.nombre}</h2>
          <div className="coop-meta">{galpon.status === 'empty' ? 'Sin lote activo' : `${galpon.aves.toLocaleString('es-CO')} aves · Día ${galpon.dia}`}</div>
        </div>
        <div className="coop-stats">
          <CS label="Día" value={galpon.dia || 0} />
          <CS label="Aves" value={galpon.aves.toLocaleString('es-CO')} />
          <CS label="Mortalidad" value="2.1%" tone="warn" />
          <CS label="Peso" value="1.42 kg" />
        </div>
      </div>

      <div className="coop-legend">
        <span className="coop-legend-title">Sensores:</span>
        {(['ok','warn','crit','info'] as DeviceStatus[]).map(s => (
          <span key={s} className="coop-legend-item"><span className="coop-legend-dot" style={{ background: SC[s] }} />{SL[s]}</span>
        ))}
        <span className="coop-legend-sep" />
        <span className="coop-legend-hint">Arrastra para girar · Scroll para acercar</span>
      </div>

      <div className="coop-body">
        <div className="coop-scene" onPointerDown={onD} onPointerMove={onM} onPointerUp={onU} onPointerLeave={onU}>
          <div className="coop-ctrl">
            <button type="button" onClick={() => setRotY(r => Math.max(-40, r - 12))}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <button type="button" onClick={() => setZoom(z => Math.min(2.5, z + 0.3))}>
              <IcPlus size={13} />
            </button>
            <button type="button" className="coop-ctrl-reset" onClick={() => { setRotY(0); setZoom(1) }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            </button>
            <button type="button" onClick={() => setZoom(z => Math.max(0.7, z - 0.3))}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
            <button type="button" onClick={() => setRotY(r => Math.min(40, r + 12))}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
          {zoom !== 1 && <div className="coop-zoom-badge mono">{Math.round(zoom * 100)}%</div>}

          {/* Galpón SVG isométrico */}
          <svg className="coop-iso" viewBox="0 0 800 520" style={{ transform: `scale(${zoom}) rotate(${rotY}deg)` }}>
            <defs>
              <linearGradient id="gFloor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d6e5dc" />
                <stop offset="100%" stopColor="#c4d8cc" />
              </linearGradient>
              <linearGradient id="gWallL" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#c8dbd0" />
                <stop offset="100%" stopColor="#b0c8ba" />
              </linearGradient>
              <linearGradient id="gWallR" x1="1" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d8e8df" />
                <stop offset="100%" stopColor="#c0d4c8" />
              </linearGradient>
              <linearGradient id="gRoofL" x1="0" y1="1" x2="0.5" y2="0">
                <stop offset="0%" stopColor="#6b9e85" />
                <stop offset="100%" stopColor="#5a8a72" />
              </linearGradient>
              <linearGradient id="gRoofR" x1="1" y1="1" x2="0.5" y2="0">
                <stop offset="0%" stopColor="#7db095" />
                <stop offset="100%" stopColor="#6b9e85" />
              </linearGradient>
            </defs>

            {/* Sombra del galpón */}
            <ellipse cx="400" cy="460" rx="350" ry="35" fill="rgba(0,0,0,0.05)" />

            {/* ══ PISO ══ */}
            <polygon points="400,370 740,215 400,60 60,215" fill="url(#gFloor)" stroke="#a5beb1" strokeWidth="2" />

            {/* Zonas del piso */}
            <polygon points="155,215 290,140 400,200 265,275" fill="rgba(16,185,129,0.08)" stroke="rgba(16,185,129,0.18)" strokeWidth="1" strokeDasharray="4 3" />
            <polygon points="290,140 510,140 535,275 265,275" fill="rgba(245,158,11,0.1)" stroke="rgba(245,158,11,0.2)" strokeWidth="1" strokeDasharray="4 3" />
            <polygon points="510,140 645,215 535,275 400,200" fill="rgba(16,185,129,0.08)" stroke="rgba(16,185,129,0.18)" strokeWidth="1" strokeDasharray="4 3" />

            {/* Labels de zona */}
            <text x="225" y="225" fill="#059669" fontSize="10" fontFamily="DM Mono,monospace" fontWeight="700" opacity="0.7">ZONA 1</text>
            <text x="370" y="210" fill="#92400e" fontSize="10" fontFamily="DM Mono,monospace" fontWeight="700">ZONA 2</text>
            <text x="520" y="225" fill="#059669" fontSize="10" fontFamily="DM Mono,monospace" fontWeight="700" opacity="0.7">ZONA 3</text>

            {/* Líneas de comederos (2 líneas paralelas) */}
            <line x1="180" y1="240" x2="620" y2="240" stroke="#b0c8ba" strokeWidth="1.5" strokeDasharray="8 5" />
            <line x1="190" y1="260" x2="610" y2="260" stroke="#b0c8ba" strokeWidth="1" strokeDasharray="5 4" />

            {/* Puntos de aves (decorativo) */}
            {[180,230,280,330,380,430,480,530,580,210,260,350,450,500,550].map((cx, i) => {
              const cy = 195 + (i % 4) * 30 + (i % 3) * 12
              return cy < 350 ? <circle key={`av${i}`} cx={cx} cy={cy} r="2.5" fill="#b0c8ba" opacity="0.4" /> : null
            })}

            {/* ══ PARED IZQUIERDA (trasera — extractores) ══ */}
            <polygon points="60,215 60,105 400,-30 400,60" fill="url(#gWallL)" stroke="#8aaa98" strokeWidth="1.5" />
            {/* Malla de alambre (líneas horizontales) */}
            {[130,145,160,175].map(y => (
              <line key={`mesh-${y}`} x1="75" y1={y + 20} x2="390" y2={y - 55} stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
            ))}
            {/* Extractores (6 ventiladores) */}
            {[0,1,2,3,4,5].map(i => {
              const cx = 110 + i * 48
              const cy = 145 - i * 9
              return (
                <g key={`ex${i}`}>
                  <circle cx={cx} cy={cy} r="14" fill="rgba(255,255,255,0.45)" stroke="#8aaa98" strokeWidth="1.2" />
                  <g className="coop-iso-fan" style={{ transformOrigin: `${cx}px ${cy}px` }}>
                    <line x1={cx-7} y1={cy} x2={cx+7} y2={cy} stroke="#6b9480" strokeWidth="1.5" />
                    <line x1={cx} y1={cy-7} x2={cx} y2={cy+7} stroke="#6b9480" strokeWidth="1.5" />
                  </g>
                </g>
              )
            })}
            <text x="200" y="100" fill="rgba(255,255,255,0.5)" fontSize="8" fontFamily="DM Mono,monospace" fontWeight="600" letterSpacing="2">EXTRACTORES</text>

            {/* ══ PARED DERECHA (frontal — cortinas) ══ */}
            <polygon points="740,215 740,105 400,-30 400,60" fill="url(#gWallR)" stroke="#8aaa98" strokeWidth="1.5" />
            {/* Cortinas enrollables */}
            {[0,1,2,3,4,5].map(i => {
              const x1 = 460 + i * 48
              const yt = 40 - i * 8
              return (
                <g key={`ct${i}`}>
                  <line x1={x1} y1={yt} x2={x1} y2={yt + 55} stroke="rgba(255,255,255,0.25)" strokeWidth="8" strokeLinecap="round" />
                  <rect x={x1 - 5} y={yt - 2} width="10" height="4" rx="2" fill="rgba(255,255,255,0.35)" />
                </g>
              )
            })}
            <text x="580" y="100" fill="rgba(255,255,255,0.4)" fontSize="8" fontFamily="DM Mono,monospace" fontWeight="600" letterSpacing="2">CORTINAS</text>

            {/* Murete base (25-30cm pared lateral real) */}
            <line x1="60" y1="215" x2="60" y2="195" stroke="#8aaa98" strokeWidth="3" />
            <line x1="740" y1="215" x2="740" y2="195" stroke="#8aaa98" strokeWidth="3" />

            {/* ══ TECHO ══ */}
            {/* Lado izquierdo */}
            <polygon points="45,100 400,-60 400,-30 45,105" fill="url(#gRoofL)" stroke="#4d7d65" strokeWidth="1.5" />
            {/* Lado derecho */}
            <polygon points="755,100 400,-60 400,-30 755,105" fill="url(#gRoofR)" stroke="#4d7d65" strokeWidth="1.5" />
            {/* Caballete (cumbrera) */}
            <line x1="400" y1="-60" x2="400" y2="-30" stroke="#3d6b55" strokeWidth="4" strokeLinecap="round" />
            {/* Línea de aleros */}
            <line x1="40" y1="103" x2="400" y2="-32" stroke="#4d7d65" strokeWidth="1.5" />
            <line x1="760" y1="103" x2="400" y2="-32" stroke="#4d7d65" strokeWidth="1.5" />

            {/* Alero frontal */}
            <polygon points="740,215 755,105 755,100 740,210" fill="#7db095" stroke="#4d7d65" strokeWidth="0.5" opacity="0.5" />
            {/* Alero trasero */}
            <polygon points="60,215 45,105 45,100 60,210" fill="#6b9e85" stroke="#4d7d65" strokeWidth="0.5" opacity="0.5" />

            {/* ══ PUERTA DE ENTRADA ══ */}
            <g>
              <rect x="55" y="150" width="10" height="45" rx="2" fill="rgba(59,130,246,0.2)" stroke="rgba(59,130,246,0.4)" strokeWidth="1.5" />
              <circle cx="63" cy="172" r="1.5" fill="rgba(59,130,246,0.5)" />
            </g>

            {/* ══ SILO DE ALIMENTO ══ */}
            <g>
              <rect x="755" y="150" width="28" height="55" rx="5" fill="#b8c8c0" stroke="#8aaa98" strokeWidth="1.5" />
              <ellipse cx="769" cy="150" rx="14" ry="8" fill="#a8bab2" stroke="#8aaa98" strokeWidth="1" />
              <rect x="765" y="205" width="8" height="15" rx="1" fill="#a0b4aa" stroke="#8aaa98" strokeWidth="0.8" />
              <text x="769" y="185" textAnchor="middle" fill="#6b8878" fontSize="7" fontFamily="DM Mono,monospace" fontWeight="600">SILO</text>
            </g>

            {/* ══ TANQUE DE AGUA ══ */}
            <g>
              <rect x="30" y="240" width="18" height="30" rx="3" fill="rgba(59,130,246,0.15)" stroke="rgba(59,130,246,0.3)" strokeWidth="1" />
              <text x="39" y="260" textAnchor="middle" fill="rgba(59,130,246,0.5)" fontSize="6" fontFamily="DM Mono,monospace">H₂O</text>
            </g>
          </svg>

          {/* Sensores flotantes sobre la escena */}
          {SENSORS.map(s => {
            const on = s.id === activeId
            return (
              <button key={s.id} className={`coop-point${on ? ' active' : ''}`}
                style={{ left: `${s.x}%`, top: `${s.y}%`, '--pt-color': SC[s.status] } as React.CSSProperties}
                onClick={() => setActiveId(s.id)}>
                <span className="coop-point-core">{ic(s.type, 12)}</span>
                <span className="coop-point-tag"><b>{s.value}</b><small>{s.unit}</small></span>
                {s.status === 'warn' && <span className="coop-point-ping" />}
              </button>
            )
          })}
        </div>

        <aside className="coop-inspector" style={{ '--ins-color': SC[active.status] } as React.CSSProperties}>
          <div className="coop-ins-head">
            <div className="coop-ins-icon">{ic(active.type, 20)}</div>
            <div><div className="coop-ins-name">{active.label}</div><div className="coop-ins-zone">{active.zone}</div></div>
          </div>
          <div className="coop-ins-reading"><span className="coop-ins-value mono">{active.value}</span><span className="coop-ins-unit">{active.unit}</span></div>
          <div className="coop-ins-badge" data-status={active.status}>{active.status === 'warn' && <IcAlert size={12} />}{SL[active.status]}</div>
          {active.max > 1 && (
            <div className="coop-ins-gauge">
              <div className="coop-ins-gauge-track">
                <div className="coop-ins-gauge-ideal" style={{ left: `${iS}%`, width: `${iE - iS}%` }} />
                <div className="coop-ins-gauge-marker" style={{ left: `${gp}%` }} />
              </div>
              <div className="coop-ins-gauge-labels"><span>{active.min}{active.unit}</span><span className="coop-ins-gauge-ideal-label">Rango ideal</span><span>{active.max}{active.unit}</span></div>
            </div>
          )}
          <p className="coop-ins-note">{active.note}</p>
          <div className="coop-ins-actions">
            <button type="button" className="coop-ins-btn primary"><IcSettings size={13} /> Configurar</button>
            <button type="button" className="coop-ins-btn"><IcRefresh size={13} /> Actualizar</button>
          </div>
          <button type="button" className="coop-ins-link">Ver historial <IcChevronRight size={12} /></button>
        </aside>
      </div>

      <div className="coop-strip">
        {SENSORS.filter(s => s.type !== 'access').map(s => {
          const n = s.type === 'temp' ? s.zone.split('·')[1]?.trim() || s.zone : s.label
          return (
            <button key={s.id} className={`coop-chip${activeId === s.id ? ' active' : ''}`}
              style={{ '--chip-color': SC[s.status] } as React.CSSProperties} onClick={() => setActiveId(s.id)}>
              <span className="coop-chip-dot" /><span className="coop-chip-icon">{ic(s.type, 12)}</span>
              <span className="coop-chip-val mono">{s.value}<small>{s.unit}</small></span>
              <span className="coop-chip-name">{n}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

const CS = ({ label, value, tone = 'default' }: { label: string; value: ReactNode; tone?: 'default' | 'warn' }) => (
  <div className={`coop-stat tone-${tone}`}><span>{label}</span><strong className="mono">{value}</strong></div>
)

export default CoopPlaceholder
