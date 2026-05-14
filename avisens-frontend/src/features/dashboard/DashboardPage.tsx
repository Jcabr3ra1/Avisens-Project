import { useNavigate, NavLink } from 'react-router-dom'
import './DashboardPage.css'

const GRANJAS = [
  { nombre: 'Granja Las Palmas', municipio: 'Popayán',  aves: 14500, alertas: 2, lotes: 2 },
  { nombre: 'Granja El Paraíso', municipio: 'Cajibío',  aves: 8000,  alertas: 0, lotes: 1 },
  { nombre: 'Granja Los Pinos',  municipio: 'Timbío',   aves: 5000,  alertas: 0, lotes: 1 },
]

const ALERTAS = [
  { tipo: 'Humedad Baja',    sev: 'media', galpon: 'GP-01', valor: '67%',      umbral: '70%',      hace: '18 min' },
  { tipo: 'CO₂ Elevado',     sev: 'media', galpon: 'GP-01', valor: '1820 ppm', umbral: '2500 ppm', hace: '2 h'   },
  { tipo: 'Sensor Inactivo', sev: 'baja',  galpon: 'GP-02', valor: '—',        umbral: '—',        hace: '4 h'   },
]

const AMBIENTE = { temperatura: 24.5, humedad: 67, co2: 1820, nh3: 11 }
const LOTE = { codigo: 'L-2026-0042', diaActual: 28, pesoPromedio: 1650, mortalidad: 2.5 }

const SEV_COLOR: Record<string, string> = { alta: '#ef4444', media: '#f59e0b', baja: '#3b82f6' }
const SEV_LABEL: Record<string, string> = { alta: 'Alta', media: 'Media', baja: 'Baja' }

const NAV_ITEMS = [
  { label: 'Dashboard',       path: '/dashboard'       },
  { label: 'Monitoreo',       path: '/monitoreo'       },
  { label: 'Bitácora',        path: '/bitacora'        },
  { label: 'Alertas',         path: '/alertas',   badge: 2 },
  { label: 'Finanzas',        path: '/finanzas'        },
  { label: 'Inventario',      path: '/inventario'      },
  { label: 'Infraestructura', path: '/infraestructura' },
  { label: 'CRM',             path: '/crm'             },
  { label: 'Granjas',         path: '/granjas'         },
  { label: 'Usuarios',        path: '/usuarios'        },
]

function DashboardPage() {
  const navigate = useNavigate()
  const totalAves = GRANJAS.reduce((a, g) => a + g.aves, 0)
  const totalAlertas = GRANJAS.reduce((a, g) => a + g.alertas, 0)

  return (
    <div className="dash-page">
      <div className="dash-topbar">
        <div className="dash-topbar-brand">
          <span className="dash-brand-dot" />
          <span className="dash-brand-name">AVISENS</span>
          <span className="dash-brand-ver">v1.0</span>
        </div>
        <div className="dash-topbar-right">
          <div className="dash-live-badge">
            <span className="dash-live-dot" />
            En vivo
          </div>
          <span className="dash-granja-chip">Granja Las Palmas — Popayán</span>
          <button className="dash-logout-btn" onClick={() => navigate('/login')}>
            Cerrar sesión
          </button>
        </div>
      </div>

      <div className="dash-content">
        <div className="dash-sidebar">
          <nav className="dash-nav" aria-label="Navegación principal">
            {NAV_ITEMS.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `dash-nav-item${isActive ? ' dash-nav-active' : ''}`}
              >
                {item.label}
                {item.badge ? <span className="dash-nav-badge">{item.badge}</span> : null}
              </NavLink>
            ))}
          </nav>
          <div className="dash-sidebar-footer">
            <div className="dash-user-avatar">CM</div>
            <div>
              <div className="dash-user-name">Carlos Muñoz</div>
              <div className="dash-user-rol">Usuario</div>
            </div>
          </div>
        </div>

        <main className="dash-main">
          <div className="dash-page-header">
            <div>
              <h1 className="dash-page-title">Dashboard</h1>
              <p className="dash-page-sub">Vista general del sistema · 3 granjas activas · Cauca, Colombia</p>
            </div>
          </div>

          <div className="dash-kpi-grid">
            {[
              { label: 'Granjas Activas',  value: GRANJAS.length,              color: '#a78bfa', sub: 'Popayán · Cajibío · Timbío' },
              { label: 'Aves en Sistema',  value: totalAves.toLocaleString(),   color: '#22d3ee', sub: '3 lotes activos este ciclo' },
              { label: 'Lote Activo',      value: `Día ${LOTE.diaActual}/42`,  color: '#10b981', sub: LOTE.codigo },
              { label: 'Alertas Abiertas', value: totalAlertas,                 color: totalAlertas > 0 ? '#f59e0b' : '#10b981', sub: totalAlertas > 0 ? 'Requieren atención' : 'Todo en orden' },
            ].map(k => (
              <div className="dash-kpi-card" key={k.label}>
                <div className="dash-kpi-label">{k.label}</div>
                <div className="dash-kpi-value" style={{ color: k.color }}>{k.value}</div>
                <div className="dash-kpi-sub">{k.sub}</div>
              </div>
            ))}
          </div>

          <div className="dash-grid-2">
            <div className="dash-card">
              <div className="dash-card-header">
                <span className="dash-card-title">Ambiente Actual · GP-01</span>
                <div className="dash-live-badge"><span className="dash-live-dot" />En vivo</div>
              </div>
              <div className="dash-env-grid">
                {[
                  { l: 'Temperatura', v: `${AMBIENTE.temperatura}°C`, ok: AMBIENTE.temperatura >= 22 && AMBIENTE.temperatura <= 26 },
                  { l: 'Humedad',     v: `${AMBIENTE.humedad}%`,      ok: AMBIENTE.humedad >= 70 },
                  { l: 'CO₂',        v: `${AMBIENTE.co2} ppm`,       ok: AMBIENTE.co2 < 2000 },
                  { l: 'NH₃',        v: `${AMBIENTE.nh3} ppm`,       ok: AMBIENTE.nh3 < 15 },
                ].map(s => (
                  <div className="dash-env-item" key={s.l}>
                    <div className="dash-env-label">{s.l}</div>
                    <div className="dash-env-value" style={{ color: s.ok ? '#10b981' : '#f59e0b' }}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="dash-card">
              <div className="dash-card-header">
                <span className="dash-card-title">Alertas Activas</span>
                <span className="dash-badge dash-badge-amber">{ALERTAS.length} abiertas</span>
              </div>
              <div className="dash-alert-list">
                {ALERTAS.map(a => (
                  <div className="dash-alert-item" key={a.tipo} style={{ borderLeftColor: SEV_COLOR[a.sev] }}>
                    <div>
                      <div className="dash-alert-tipo">{a.tipo}</div>
                      <div className="dash-alert-meta">{a.galpon} · hace {a.hace}</div>
                    </div>
                    <span className="dash-badge" style={{ background: SEV_COLOR[a.sev] + '22', color: SEV_COLOR[a.sev] }}>
                      {SEV_LABEL[a.sev]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="dash-card">
            <div className="dash-card-header">
              <span className="dash-card-title">Granjas Registradas</span>
              <span className="dash-badge dash-badge-green">{GRANJAS.length} activas</span>
            </div>
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Granja</th>
                  <th>Municipio</th>
                  <th>Lotes</th>
                  <th>Aves</th>
                  <th>Alertas</th>
                </tr>
              </thead>
              <tbody>
                {GRANJAS.map(g => (
                  <tr key={g.nombre}>
                    <td className="dash-table-name">{g.nombre}</td>
                    <td>{g.municipio}, Cauca</td>
                    <td>{g.lotes}</td>
                    <td className="dash-table-mono">{g.aves.toLocaleString()}</td>
                    <td>
                      {g.alertas > 0
                        ? <span className="dash-badge dash-badge-red">{g.alertas}</span>
                        : <span className="dash-badge dash-badge-green">OK</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="dash-lote-card">
            <div className="dash-lote-header">
              <div>
                <div className="dash-lote-code">{LOTE.codigo}</div>
                <div className="dash-lote-desc">Galpón Norte GP-01 · Cobb 500 · Macho · Día {LOTE.diaActual} de 42</div>
              </div>
              <div className="dash-lote-stats">
                <div className="dash-lote-stat">
                  <span className="dash-lote-stat-label">Peso prom.</span>
                  <span className="dash-lote-stat-value" style={{ color: '#10b981' }}>{LOTE.pesoPromedio.toLocaleString()} g</span>
                </div>
                <div className="dash-lote-stat">
                  <span className="dash-lote-stat-label">Mortalidad</span>
                  <span className="dash-lote-stat-value" style={{ color: LOTE.mortalidad >= 3 ? '#ef4444' : '#f59e0b' }}>{LOTE.mortalidad}%</span>
                </div>
              </div>
            </div>
            <div className="dash-progress-bar-wrap">
              <div className="dash-progress-bar" style={{ width: `${(LOTE.diaActual / 42) * 100}%` }} />
            </div>
            <div className="dash-progress-labels">
              <span>Día 1</span>
              <span>{42 - LOTE.diaActual} días restantes · Salida est. 26 May 2026</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default DashboardPage
