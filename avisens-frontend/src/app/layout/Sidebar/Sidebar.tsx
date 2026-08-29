import { NavLink, useNavigate } from 'react-router-dom'
import { IcSidebar } from '@shared/ui/icons/icons'
import { getUsuario, logout } from '@shared/api'
import { useConteoNotificaciones } from '@features/notificaciones/hooks/useNotificaciones'
import logoAvisens from '@shared/assets/logo-avisens.png'
import {
  NAV_SECTIONS,
  ROL_ADMIN,
  esGrupo,
  itemVisible,
  type NavItem,
  type NavLinkItem,
} from './navConfig'
import './Sidebar.css'

type Props = {
  collapsed: boolean
  onToggle: () => void
  rol: string | null
}

function filtrarItems(items: NavItem[], rol: string | null): NavLinkItem[] {
  return items.filter(
    (item): item is NavLinkItem => !esGrupo(item) && itemVisible(item, rol),
  )
}

const Sidebar = ({ collapsed, onToggle, rol }: Props) => {
  const navigate = useNavigate()
  const usuario = getUsuario()
  const { noLeidas } = useConteoNotificaciones()
  const rutaInicio = rol === ROL_ADMIN ? '/admin' : '/dashboard'

  const secciones = NAV_SECTIONS
    .map((section) => ({ ...section, items: filtrarItems(section.items, rol) }))
    .filter((section) => section.items.length > 0)

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  function renderLink(item: NavLinkItem, nested = false) {
    const badge =
      item.path === '/notificaciones' && noLeidas > 0 ? noLeidas : item.badge
    const contenido = (
      <>
        <span className="dash-side-accent" />
        <span className="dash-side-item-icon" aria-hidden="true">
          {item.icon}
          {badge ? <span className="dash-side-item-icon-dot" /> : null}
        </span>
        <span className="dash-side-item-label">{item.label}</span>
        {badge ? <span className="dash-side-badge">{badge}</span> : null}
      </>
    )
    const className = 'dash-side-item' + (nested ? ' dash-side-subitem' : '')

    if (item.nuevaPestana) {
      return (
        <a
          key={item.path}
          href={item.path}
          target="_blank"
          rel="noreferrer"
          data-label={item.label}
          className={className}
        >
          {contenido}
        </a>
      )
    }

    return (
      <NavLink
        key={item.path}
        to={item.path}
        data-label={item.label}
        className={({ isActive }) => className + (isActive ? ' active' : '')}
        end
      >
        {contenido}
      </NavLink>
    )
  }

  return (
    <aside className="dash-sidebar">
      <div className="dash-side-blob" />

      <div className="dash-side-header">
        <NavLink
          to={rutaInicio}
          className="dash-side-brand"
          aria-label="Ir al panel principal de AVISENS"
        >
          <div className="dash-workspace-logo">
            <img src={logoAvisens} alt="AVISENS" className="dash-workspace-logo-img" />
          </div>
          <div className="dash-workspace-name">AVISENS</div>
        </NavLink>
        <button
          className="dash-sidebar-toggle"
          onClick={onToggle}
          title={collapsed ? 'Expandir sidebar (⌘B)' : 'Contraer sidebar (⌘B)'}
          aria-label={collapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'}
          aria-expanded={!collapsed}
        >
          <IcSidebar size={15} />
        </button>
      </div>

      <nav className="dash-side-nav" aria-label="Navegación principal">
        {secciones.map((section) => (
          <div className="dash-side-section" key={section.label}>
            <div className="dash-side-section-label">{section.label}</div>
            {section.items.map((item) => renderLink(item))}
          </div>
        ))}
      </nav>

      <div className="dash-side-user">
        <div className="dash-side-user-info">
          <div className="dash-side-user-avatar">
            {usuario?.nombre
              ? usuario.nombre
                  .split(' ')
                  .slice(0, 2)
                  .map((parte) => parte[0])
                  .join('')
                  .toUpperCase()
              : '?'}
          </div>
          <div className="dash-side-user-text">
            <span className="dash-side-user-name">{usuario?.nombre ?? 'Usuario'}</span>
            <span className="dash-side-user-rol">{usuario?.rol ?? ''}</span>
          </div>
        </div>
        <button
          className="dash-side-logout"
          onClick={handleLogout}
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
