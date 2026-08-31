import { NavLink, useNavigate } from 'react-router-dom'
import { IcCheck, IcLeaf, IcServer, IcSidebar, IcUsers } from '@shared/ui/icons/icons'
import { getUsuario, logout } from '@shared/api'
import logoAvisens from '@shared/assets/logo-avisens.png'
import CampanaNotificaciones from './CampanaNotificaciones'
import {
  NAV_SECTIONS,
  ROL_ADMIN,
  ROL_OPERARIO,
  ROL_PROPIETARIO,
  esGrupo,
  itemVisible,
  rutaInicioPorRol,
  type NavItem,
  type NavLinkItem,
} from './navConfig'
import './Sidebar.css'

function iniciales(nombre?: string): string {
  if (!nombre) return '?'
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase()
}

type Props = {
  collapsed: boolean
  onToggle: () => void
  rolAutenticado: string | null
  rolVista: string | null
  onCambiarVista: (rol: string) => void
}

function filtrarItems(items: NavItem[], rol: string | null): NavLinkItem[] {
  return items.filter(
    (item): item is NavLinkItem => !esGrupo(item) && itemVisible(item, rol),
  )
}

const MODOS_DE_VISTA = [
  { rol: ROL_ADMIN, etiqueta: 'Admin', descripcion: 'Control total', icono: IcServer },
  { rol: ROL_PROPIETARIO, etiqueta: 'Propietario', descripcion: 'Mi producción', icono: IcLeaf },
  { rol: ROL_OPERARIO, etiqueta: 'Operario', descripcion: 'Trabajo diario', icono: IcUsers },
]

const Sidebar = ({ collapsed, onToggle, rolAutenticado, rolVista, onCambiarVista }: Props) => {
  const navigate = useNavigate()
  const usuario = getUsuario()
  const rutaInicio = rutaInicioPorRol(rolVista)

  const secciones = NAV_SECTIONS
    .map((section) => ({ ...section, items: filtrarItems(section.items, rolVista) }))
    .filter((section) => section.items.length > 0)

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  function renderLink(item: NavLinkItem, nested = false) {
    const badge = item.badge
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
        <CampanaNotificaciones />
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

      <div className="dash-side-perfil">
        <div className="dash-side-perfil-foto">{iniciales(usuario?.nombre)}</div>
        <span className="dash-side-perfil-nombre">{usuario?.nombre ?? 'Usuario'}</span>
        <span className="dash-side-perfil-rol">
          {rolAutenticado === ROL_ADMIN && rolVista !== ROL_ADMIN
            ? `Viendo como ${rolVista}`
            : usuario?.rol ?? ''}
        </span>
      </div>

      {rolAutenticado === ROL_ADMIN && (
        <section className="dash-side-modos" aria-label="Cambiar la vista por rol">
          <div className="dash-side-modos-cabecera">
            <div>
              <span className="dash-side-modos-titulo">Vista previa</span>
              <span className="dash-side-modos-subtitulo">Cambia sólo lo que ves, no tus permisos</span>
            </div>
            <span className="dash-side-modos-badge">Sólo la vista</span>
          </div>
          <div className="dash-side-modos-opciones" role="group" aria-label="Roles disponibles">
            {MODOS_DE_VISTA.map(({ rol, etiqueta, descripcion, icono: Icono }) => (
              <button
                key={rol}
                type="button"
                className={`dash-side-modo${rolVista === rol ? ' activo' : ''}`}
                onClick={() => onCambiarVista(rol)}
                aria-pressed={rolVista === rol}
                aria-label={`Cambiar a vista ${etiqueta}: ${descripcion}`}
                title={`${etiqueta}: ${descripcion}`}
              >
                <span className="dash-side-modo-icono" aria-hidden="true"><Icono size={17} /></span>
                <span className="dash-side-modo-label">{etiqueta}</span>
                {rolVista === rol && (
                  <span className="dash-side-modo-activo" aria-hidden="true"><IcCheck size={11} /></span>
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      <nav className="dash-side-nav" aria-label="Navegación principal">
        {secciones.map((section) => (
          <div className="dash-side-section" key={section.label}>
            <div className="dash-side-section-label">{section.label}</div>
            {section.items.map((item) => renderLink(item))}
          </div>
        ))}
      </nav>

      <div className="dash-side-user">
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
