// Sidebar.tsx — Menú lateral del dashboard
// Muestra la navegación principal con 3 secciones: Día a día, Plata y cuentas, Configuración
// Incluye panel de estado ("Todo conectado") con galpones, aves y alertas
// Se colapsa con ⌘B, en móvil se convierte en bottom navigation
import { NavLink } from 'react-router-dom'
import { IcSidebar } from '@shared/ui/icons/icons'
import { NAV_SECTIONS, itemVisible } from './navConfig'
import './Sidebar.css'

type Props = {
  collapsed: boolean
  onToggle: () => void
  rol: string | null
  galponesActivos: number
  totalAves: number
  totalAlertas: number
}

const Sidebar = ({ collapsed, onToggle, rol, galponesActivos, totalAves, totalAlertas }: Props) => {
  // Cada rol solo ve los menús permitidos; las secciones que quedan vacías se ocultan.
  const secciones = NAV_SECTIONS
    .map((sec) => ({ ...sec, items: sec.items.filter((item) => itemVisible(item, rol)) }))
    .filter((sec) => sec.items.length > 0)

  return (
  <aside className="dash-sidebar">
    <div className="dash-side-blob" />

    <div className="dash-side-header">
      <div className="dash-side-brand">
        <div className="dash-workspace-logo">
          <img src="/views/avisens/img/logo.png" alt="AVISENS" className="dash-workspace-logo-img" />
        </div>
        <div className="dash-workspace-name">
          AVISENS
        </div>
      </div>
      <button
        className="dash-sidebar-toggle"
        onClick={onToggle}
        title={collapsed ? 'Expandir sidebar (⌘B)' : 'Contraer sidebar (⌘B)'}
        aria-label="Alternar sidebar"
      >
        <IcSidebar size={15} />
      </button>
    </div>

    <nav className="dash-side-nav" aria-label="Navegación principal">
      {secciones.map((sec) => (
        <div className="dash-side-section" key={sec.label}>
          <div className="dash-side-section-label">{sec.label}</div>
          {sec.items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              data-label={item.label}
              className={({ isActive }) => `dash-side-item${isActive ? ' active' : ''}`}
              end
            >
              <span className="dash-side-accent" />
              <span className="dash-side-item-icon">
                {item.icon}
                {item.badge ? <span className="dash-side-item-icon-dot" /> : null}
              </span>
              <span className="dash-side-item-label">{item.label}</span>
              {item.badge ? <span className="dash-side-badge">{item.badge}</span> : null}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>

    <div className="dash-side-status">
      <div className="dash-side-status-head">
        <span className="dash-status-pulse">
          <span className="dot" />
          <span className="ring" />
        </span>
        <span className="dash-side-status-title">Todo conectado</span>
      </div>
      <div className="dash-side-status-stats">
        <div className="dash-side-stat">
          <span className="dash-side-stat-num mono">{galponesActivos}</span>
          <span className="dash-side-stat-lbl">galpones</span>
        </div>
        <div className="dash-side-stat">
          <span className="dash-side-stat-num mono">{(totalAves / 1000).toFixed(1)}k</span>
          <span className="dash-side-stat-lbl">aves</span>
        </div>
        <div className="dash-side-stat">
          <span
            className="dash-side-stat-num mono"
            style={{ color: totalAlertas > 0 ? 'var(--warning)' : 'var(--green-d)' }}
          >
            {totalAlertas}
          </span>
          <span className="dash-side-stat-lbl">alertas</span>
        </div>
      </div>
    </div>
  </aside>
  )
}

export default Sidebar
