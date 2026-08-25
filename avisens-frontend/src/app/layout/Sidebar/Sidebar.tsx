// Sidebar.tsx — Menú lateral del dashboard
// Muestra la navegación principal con 3 secciones: Día a día, Plata y cuentas, Configuración
// Incluye panel de estado ("Todo conectado") con galpones, aves y alertas
// Se colapsa con ⌘B, en móvil se convierte en bottom navigation
import { NavLink, useNavigate } from 'react-router-dom'
import { IcSidebar } from '@shared/ui/icons/icons'
import { NAV_SECTIONS, itemVisible } from './navConfig'
// getUsuario lee la sesión del localStorage; logout la revoca en el backend (EP-03 HU-17)
import { getUsuario, logout } from '@shared/api'
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
  const navigate = useNavigate()

  // Datos del usuario logueado para el pie del sidebar (EP-03 HU-17)
  const usuario = getUsuario()

  // Cierra la sesión: revoca el refresh token en el backend y limpia localStorage
  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  // Cada rol solo ve los menús permitidos; las secciones vacías se ocultan
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
          {sec.items.map((item) => {
            // El badge de "Alertas" no es un número fijo — es la misma cuenta
            // en vivo que muestra el panel de estado de abajo y la página de
            // Alertas, para que nunca se vean números distintos entre sí.
            const badge = item.path === '/alertas' ? totalAlertas : item.badge

            const contenido = (
              <>
                <span className="dash-side-accent" />
                <span className="dash-side-item-icon">
                  {item.icon}
                  {badge ? <span className="dash-side-item-icon-dot" /> : null}
                </span>
                <span className="dash-side-item-label">{item.label}</span>
                {badge ? <span className="dash-side-badge">{badge}</span> : null}
              </>
            )

            // Rutas públicas fuera del panel: se abren aparte para no perder
            // el panel abierto (ver `nuevaPestana` en navConfig.tsx).
            if (item.nuevaPestana) {
              return (
                <a
                  key={item.path}
                  href={item.path}
                  target="_blank"
                  rel="noreferrer"
                  data-label={item.label}
                  className="dash-side-item"
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
                className={({ isActive }) => `dash-side-item${isActive ? ' active' : ''}`}
                end
              >
                {contenido}
              </NavLink>
            )
          })}
        </div>
      ))}
    </nav>

    {/* ── Estadísticas del sistema ──────────────────────────────────────── */}
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

    {/* ── Usuario logueado + cerrar sesión (EP-03 HU-17) ───────────────── */}
    <div className="dash-side-user">
      <div className="dash-side-user-info">
        {/* Iniciales del nombre como avatar */}
        <div className="dash-side-user-avatar">
          {usuario?.nombre
            ? usuario.nombre.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()
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
        {/* Ícono de salida (flecha hacia afuera) */}
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
