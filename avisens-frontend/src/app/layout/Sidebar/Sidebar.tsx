import { useEffect, useRef, useState, type ReactElement } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import * as Tooltip from '@radix-ui/react-tooltip'
import { IcArrowRight, IcBarn, IcBox, IcChevronDown, IcChevronRight, IcClose, IcGrid, IcLeaf, IcMoon, IcSearch, IcSidebar, IcSun } from '@shared/ui/icons/icons'
import { logout } from '@shared/api'
import { useFocoAtrapado } from '@shared/ui/Modal/useFocoAtrapado'
import logoAvisens from '@shared/assets/logo-avisens.png'
import { esGrupo, rutaInicioPorRol, type NavItem, type NavLinkItem } from './navConfig'
import { useTemaPanel } from '../useTemaPanel'
import { descripcionDe, matchesPath, navigationSpaces, spaceForPath, tieneUnSoloDestino, visibleSections, type NavigationSpace, type SpaceId } from './navigation'
import './Sidebar.css'

const SPACE_ICONS = { plataforma: IcGrid, granja: IcLeaf, bodega: IcBarn, gestion: IcBox }

// Nombres cortos para que quepan bajo el ícono del riel.
const ETIQUETA_RIEL: Record<string, string> = {
  '/solicitudes-pqrs': 'PQRS',
  '/recuperaciones-password': 'Accesos',
  '/organizaciones': 'Clientes',
}

function Hint({ label, children }: { label: string; children: ReactElement }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className="dash-navigation-hint" side="right" sideOffset={10} collisionPadding={12}>
          {label}<Tooltip.Arrow />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

function primerDestino(space: NavigationSpace | undefined): string | undefined {
  const item = space?.sections[0]?.items[0]
  if (!item) return undefined
  return esGrupo(item) ? item.children[0]?.path : item.path
}

type Props = {
  collapsed: boolean
  mobileOpen: boolean
  onCloseMobile: () => void
  onToggle: () => void
  onOpenSearch: () => void
  rol: string | null
}

export default function Sidebar({ collapsed, mobileOpen, onCloseMobile, onToggle, onOpenSearch, rol }: Props) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const sidebar = useRef<HTMLElement>(null)
  const [selection, setSelection] = useState<{ route: string; space: SpaceId } | null>(null)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const [loggingOut, setLoggingOut] = useState(false)
  const { tema, alternar: alternarTema } = useTemaPanel()
  const [gruposAbiertos, setGruposAbiertos] = useState<Partial<Record<SpaceId, boolean>>>({})
  const sections = visibleSections(rol)
  const spaces = navigationSpaces(sections)
  const routeSpace = spaceForPath(pathname, spaces)
  // Una exploración manual dura hasta cambiar de pantalla: la ruta vuelve a
  // mostrar su espacio automáticamente, también al usar Atrás y Adelante.
  const selected = selection?.route === pathname
    ? spaces.find((space) => space.id === selection.space) ?? routeSpace
    : routeSpace
  const home = sections.find((section) => section.label === 'Inicio')?.items.find((item): item is NavLinkItem => !esGrupo(item))
  const rutaInicio = rutaInicioPorRol(rol)
  const enInicio = Boolean(home && matchesPath(pathname, home.path))
  const railLinks = sections.find((section) => section.label === 'Riel')?.items.filter((item): item is NavLinkItem => !esGrupo(item)) ?? []
  const enRiel = railLinks.some((item) => matchesPath(pathname, item.path))
  const explorandoEspacio = selection?.route === pathname
  const sinPanel = tieneUnSoloDestino(selected) || (enRiel && !explorandoEspacio)
  const rutaEnEspacio = spaces.some((space) => space.sections.some((section) => section.items.some((item) =>
    matchesPath(pathname, item.path) || (esGrupo(item) && item.children.some((child) => matchesPath(pathname, child.path))),
  )))
  const shortcut = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘ K' : 'Ctrl K'

  useEffect(() => {
    setSelection(null)
    setGruposAbiertos({})
  }, [pathname])

  useFocoAtrapado(sidebar, mobileOpen, onCloseMobile)

  useEffect(() => {
    if (!mobileOpen) return
    // La visibilidad del drawer se resuelve durante su transición. Enfocar
    // antes deja el foco fuera; esperamos a que el control admita el foco.
    let frame = 0
    let attempts = 0
    const focusVisibleDrawer = () => {
      if (sidebar.current?.contains(document.activeElement)) return
      const close = sidebar.current?.querySelector<HTMLButtonElement>('.dash-sidebar-close')
      if (!close || attempts++ >= 30) return
      if (getComputedStyle(close).visibility === 'visible') {
        close.focus({ preventScroll: true })
        if (document.activeElement === close) return
      }
      frame = window.requestAnimationFrame(focusVisibleDrawer)
    }
    frame = window.requestAnimationFrame(focusVisibleDrawer)
    return () => window.cancelAnimationFrame(frame)
  }, [mobileOpen])

  function selectHome() {
    setSelection(null)
    onCloseMobile()
    if (!collapsed && window.matchMedia('(min-width: 901px)').matches) onToggle()
  }

  function selectSpace(id: SpaceId) {
    const espacio = spaces.find((space) => space.id === id)
    const destino = primerDestino(espacio)
    if (destino && tieneUnSoloDestino(espacio)) {
      onCloseMobile()
      navigate(destino)
      return
    }
    if (destino && (routeSpace?.id !== id || enInicio || enRiel)) navigate(destino)
    else setSelection({ route: pathname, space: id })
    if (collapsed && window.matchMedia('(min-width: 901px)').matches) onToggle()
  }

  function grupoAbierto(space: NavigationSpace) {
    const contieneRuta = space.sections.some((section) => section.items.some((item) =>
      matchesPath(pathname, item.path) || (esGrupo(item) && item.children.some((child) => matchesPath(pathname, child.path)))))
    return gruposAbiertos[space.id] ?? contieneRuta
  }

  function alternarGrupo(space: NavigationSpace) {
    setGruposAbiertos((actual) => ({ ...actual, [space.id]: !grupoAbierto(space) }))
  }

  function enlaceArbol(item: NavLinkItem, hijo: boolean) {
    const activo = matchesPath(pathname, item.path)
    return (
      <Hint key={item.path} label={descripcionDe(item.path, rol) ?? item.label}>
        <NavLink
          to={item.path}
          className={`${hijo ? 'dash-arbol-hijo' : 'dash-arbol-item'}${activo ? ' is-activo' : ''}`}
          end={item.path !== '/organizaciones'}
          aria-current={activo ? 'page' : undefined}
          aria-label={item.label}
        >
          <span className="dash-arbol-icono" aria-hidden="true">{item.icon}</span>
          <span className="dash-arbol-texto">{ETIQUETA_RIEL[item.path] ?? item.label}</span>
          {item.badge ? <span className="dash-arbol-badge">{item.badge}</span> : null}
        </NavLink>
      </Hint>
    )
  }

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    await logout()
    onCloseMobile()
    navigate('/login')
  }

  function renderLink(item: NavLinkItem, nested = false) {
    const content = (
      <>
        <span className="dash-side-item-icon" aria-hidden="true">{item.icon}</span>
        <span className="dash-side-item-copy">
          <span className="dash-side-item-label">{item.label}</span>
          {!nested && <small>{descripcionDe(item.path, rol)}</small>}
        </span>
        {item.badge ? <span className="dash-side-badge">{item.badge}</span> : <IcArrowRight size={14} className="dash-side-item-arrow" />}
      </>
    )
    const className = `dash-side-item${nested ? ' dash-side-subitem' : ''}`
    if (item.nuevaPestana) {
      return <a key={item.path} href={item.path} target="_blank" rel="noreferrer" className={className} onClick={onCloseMobile}>{content}</a>
    }
    return (
      <NavLink key={item.path} to={item.path} className={({ isActive }) => className + (isActive ? ' active' : '')} onClick={onCloseMobile} end={!nested && item.path !== '/organizaciones'}>
        {content}
      </NavLink>
    )
  }

  function renderItem(item: NavItem) {
    if (!esGrupo(item)) return renderLink(item)
    const active = item.children.some((child) => matchesPath(pathname, child.path))
    const open = openGroups[item.path] ?? active
    const id = `nav-group-${item.path.replace(/\W+/g, '-')}`
    return (
      <div className="dash-side-group" key={item.path}>
        <button type="button" className={`dash-side-item dash-side-group-toggle${active ? ' active' : ''}`} aria-expanded={open} aria-controls={id} onClick={() => setOpenGroups((current) => ({ ...current, [item.path]: !open }))}>
          <span className="dash-side-item-icon" aria-hidden="true">{item.icon}</span>
          <span className="dash-side-item-copy"><span className="dash-side-item-label">{item.label}</span></span>
          <span aria-hidden="true">{open ? <IcChevronDown size={14} /> : <IcChevronRight size={14} />}</span>
        </button>
        <div className="dash-side-subnav" id={id} hidden={!open}>{item.children.map((child) => renderLink(child, true))}</div>
      </div>
    )
  }

  return (
    <Tooltip.Provider delayDuration={350} skipDelayDuration={150} disableHoverableContent>
      <aside ref={sidebar} id="navegacion-principal" className={`dash-sidebar${mobileOpen ? ' is-mobile-open' : ''}${sinPanel ? ' is-sin-panel' : ''}`} aria-label="Menú principal" data-route={pathname}>
        <div className="dash-rail">
          <Hint label="Volver al inicio">
            <NavLink to={rutaInicio} className="dash-side-brand" aria-label="Ir al panel principal de AVISENS" onClick={selectHome}>
              <img src={logoAvisens} alt="" width={48} height={48} />
            </NavLink>
          </Hint>
          <nav className="dash-arbol" aria-label="Navegación principal">
            {home && enlaceArbol(home, false)}
            {spaces.map((space) => {
              const SpaceIcon = SPACE_ICONS[space.id]
              const hijos = space.sections.flatMap((section) => section.items).flatMap((item) => esGrupo(item) ? item.children : [item])
              if (hijos.length === 1) return enlaceArbol({ ...hijos[0], icon: <SpaceIcon size={20} />, label: space.label }, false)
              const abierto = grupoAbierto(space)
              const contieneRuta = hijos.some((item) => matchesPath(pathname, item.path))
              const idHijos = `dash-arbol-${space.id}`
              const boton = (
                <button
                  type="button"
                  className={`dash-arbol-item dash-arbol-grupo${contieneRuta ? ' is-dentro' : ''}`}
                  aria-expanded={abierto}
                  aria-controls={idHijos}
                  onClick={() => alternarGrupo(space)}
                >
                  <span className="dash-arbol-icono" aria-hidden="true"><SpaceIcon size={20} /></span>
                  <span className="dash-arbol-texto">{space.label}</span>
                  <IcChevronDown size={12} className="dash-arbol-flecha" aria-hidden="true" />
                </button>
              )
              return (
                <div key={space.id} className={`dash-arbol-seccion${abierto ? ' is-abierta' : ''}${contieneRuta ? ' is-dentro' : ''}`}>
                  <Hint label={space.description}>{boton}</Hint>
                  <div className="dash-arbol-hijos" id={idHijos} hidden={!abierto}>
                    {hijos.map((item) => enlaceArbol(item, true))}
                  </div>
                </div>
              )
            })}
            {railLinks.map((item) => enlaceArbol(item, false))}
          </nav>
          <nav className="dash-rail-spaces" aria-label="Espacios de trabajo">
            {home && (
              <Hint label={descripcionDe(home.path, rol) ?? home.label}>
                <NavLink
                  to={home.path}
                  end
                  className={`dash-rail-space${enInicio && !explorandoEspacio ? ' is-selected' : ''}`}
                  onClick={selectHome}
                >
                  {home.icon}
                  <span>{home.label}</span>
                  {enInicio && explorandoEspacio && <i className="dash-rail-location" aria-hidden="true" />}
                </NavLink>
              </Hint>
            )}
            {spaces.map((space) => {
              const SpaceIcon = SPACE_ICONS[space.id]
              const spaceSelected = space.id === selected?.id && ((!enInicio && !enRiel && rutaEnEspacio) || explorandoEspacio)
              return (
                <Hint key={space.id} label={space.description}>
                  <button type="button" className={`dash-rail-space${spaceSelected ? ' is-selected' : ''}`} aria-pressed={spaceSelected} aria-controls="navegacion-contextual" onClick={() => selectSpace(space.id)}>
                    <SpaceIcon size={21} />
                    <span>{space.label}</span>
                    {space.id === routeSpace?.id && rutaEnEspacio && pathname !== rutaInicio && !enRiel && <i className="dash-rail-location" aria-hidden="true" />}
                  </button>
                </Hint>
              )
            })}
            {railLinks.map((item) => {
              const activo = matchesPath(pathname, item.path)
              return (
                <Hint key={item.path} label={descripcionDe(item.path, rol) ?? item.label}>
                  <NavLink to={item.path} className={`dash-rail-space${activo && !explorandoEspacio ? ' is-selected' : ''}`} onClick={selectHome}>
                    {item.icon}
                    <span>{item.label}</span>
                    {activo && explorandoEspacio && <i className="dash-rail-location" aria-hidden="true" />}
                  </NavLink>
                </Hint>
              )
            })}
          </nav>
          <div className="dash-rail-tools">
            <Hint label="Buscar en Avisens · Ctrl / ⌘ K">
              <button type="button" className="dash-rail-tool dash-rail-search" onClick={onOpenSearch} aria-label="Buscar en Avisens" aria-keyshortcuts="Control+k Meta+k"><IcSearch size={20} /></button>
            </Hint>
            <Hint label={collapsed ? 'Expandir menú · Ctrl / ⌘ B' : 'Contraer menú · Ctrl / ⌘ B'}>
              <button type="button" className="dash-rail-tool dash-sidebar-toggle" onClick={onToggle} aria-label={collapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'} aria-expanded={!collapsed} aria-controls="navegacion-contextual"><IcSidebar size={19} /></button>
            </Hint>
            <Hint label={tema === 'oscuro' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}>
              <button
                type="button"
                className="dash-rail-tool dash-rail-tema"
                onClick={alternarTema}
                aria-label={tema === 'oscuro' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              >
                {tema === 'oscuro' ? <IcSun size={19} /> : <IcMoon size={18} />}
              </button>
            </Hint>
            <Hint label="Cerrar sesión">
              <button type="button" className="dash-rail-tool dash-side-logout" onClick={handleLogout} aria-label="Cerrar sesión" disabled={loggingOut}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
              </button>
            </Hint>
          </div>
        </div>
        <div className="dash-context-panel" id="navegacion-contextual">
          <header className="dash-context-header">
            <div><h2>{selected?.label ?? 'Tu espacio'}</h2><p>{selected?.description}</p></div>
            <button type="button" className="dash-sidebar-close" onClick={onCloseMobile} aria-label="Cerrar menú"><IcClose size={19} /></button>
          </header>
          <button type="button" className="dash-navigation-search" onClick={onOpenSearch} aria-label="Buscar en Avisens" aria-keyshortcuts="Control+k Meta+k">
            <IcSearch size={17} /><span>Buscar sección</span><kbd>{shortcut}</kbd>
          </button>
          <nav className="dash-side-nav" aria-label="Navegación principal">
            {selected?.sections.map((section) => (
              <div className="dash-side-section" key={section.label}>
                {section.items.map(renderItem)}
              </div>
            ))}
          </nav>
        </div>
      </aside>
    </Tooltip.Provider>
  )
}
