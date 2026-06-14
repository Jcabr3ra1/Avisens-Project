import { NavLink } from 'react-router-dom'
import { IcEgg, IcSidebar } from '@shared/ui/icons/icons'
import { NAV_SECTIONS } from './navConfig'
import './Sidebar.css'

type Props = {
  collapsed: boolean
  onToggle: () => void
  galponesActivos: number
  totalAves: number
  totalAlertas: number
}

const Sidebar = ({ collapsed, onToggle, galponesActivos, totalAves, totalAlertas }: Props) => (
  <aside className="dash-sidebar">
    <div className="dash-side-blob" />

    <div className="dash-side-header">
      <div className="dash-side-brand">
        <div className="dash-workspace-logo">
          <IcEgg size={18} />
        </div>
        <div className="dash-workspace-name">
          avisens<span style={{ color: 'var(--green)' }}>.</span>
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
      {NAV_SECTIONS.map((sec) => (
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
        <span className="dash-side-status-title">Sistema en línea</span>
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

export default Sidebar
