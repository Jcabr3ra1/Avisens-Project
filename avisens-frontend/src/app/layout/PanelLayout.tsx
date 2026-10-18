import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar/Sidebar'
import CampanaNotificaciones from './CampanaNotificaciones'
import { puedeAcceder, rutaInicioPorRol } from './Sidebar/navConfig'
import { matchesPath, navigationSpaces, spaceForPath, tituloDeRuta, visibleSections } from './Sidebar/navigation'
import { getAccessToken, getRol, getUsuario } from '@shared/api'
import { usePauseOnHidden } from '@shared/hooks/usePauseOnHidden'
import { IcChevronRight, IcSearch, IcSidebar } from '@shared/ui/icons/icons'
import logoAvisens from '@shared/assets/logo-avisens.png'
import AvatarUsuario from './AvatarUsuario'
import './PanelLayout.css'

const NavigationSearch = lazy(() => import('./Sidebar/NavigationSearch'))

function PanelShell({
  sidebarCollapsed,
  onToggle,
  mobileMenuOpen,
  onOpenMobileMenu,
  onCloseMobileMenu,
  rol,
}: {
  sidebarCollapsed: boolean
  onToggle: () => void
  mobileMenuOpen: boolean
  onOpenMobileMenu: () => void
  onCloseMobileMenu: () => void
  rol: string | null
}) {
  const { pathname } = useLocation()
  const panel = useRef<HTMLElement>(null)
  const searchTrigger = useRef<HTMLElement | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const usuario = getUsuario()
  const sections = visibleSections(rol)
  const titulo = tituloDeRuta(pathname, rol)
  const enInicio = ['/admin', '/dashboard', '/mi-jornada'].some((ruta) => matchesPath(pathname, ruta))
  const espacio = enInicio ? 'Inicio' : spaceForPath(pathname, navigationSpaces(sections))?.label ?? 'Avisens'
  const atajo = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘ K' : 'Ctrl K'

  const openSearch = useCallback(() => {
    // El buscador reemplaza al drawer móvil; no dejamos dos trampas de foco
    // activas ni devolvemos el foco a un botón que haya quedado oculto.
    const active = document.activeElement as HTMLElement | null
    const fallback = Array.from(document.querySelectorAll<HTMLElement>('.dash-topbar-buscar, .dash-navigation-search, .dash-rail-search, .dash-mobile-search'))
      .find((element) => element.getClientRects().length > 0)
    searchTrigger.current = window.matchMedia('(max-width: 900px)').matches && mobileMenuOpen
      ? document.querySelector<HTMLElement>('.dash-mobile-menu')
      : active && active !== document.body ? active : fallback ?? null
    onCloseMobileMenu()
    setSearchOpen(true)
  }, [mobileMenuOpen, onCloseMobileMenu])

  const closeSearch = useCallback(() => {
    setSearchOpen(false)
    window.requestAnimationFrame(() => {
      const trigger = searchTrigger.current
      if (trigger?.isConnected && trigger.getClientRects().length > 0) trigger.focus()
    })
  }, [])

  useEffect(() => {
    const handleSearchShortcut = (event: KeyboardEvent) => {
      if (event.repeat || !(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return
      if (!searchOpen && document.querySelector('[role="dialog"]')) return
      event.preventDefault()
      event.stopPropagation()
      if (searchOpen) closeSearch()
      else openSearch()
    }
    window.addEventListener('keydown', handleSearchShortcut, true)
    return () => window.removeEventListener('keydown', handleSearchShortcut, true)
  }, [searchOpen, openSearch, closeSearch])

  // El panel scrollea por dentro, así que el navegador no restaura la posición
  // al cambiar de ruta: sin esto, la pantalla nueva entra a media altura.
  useEffect(() => {
    panel.current?.scrollTo({ top: 0 })
    onCloseMobileMenu()
  }, [onCloseMobileMenu, pathname])

  return (
    <div className={`dash-page${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
      <div className="dash-shell">
        <Sidebar
          collapsed={sidebarCollapsed}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={onCloseMobileMenu}
          onToggle={onToggle}
          onOpenSearch={openSearch}
          rol={rol}
        />
        {mobileMenuOpen && (
          <button
            type="button"
            className="dash-sidebar-backdrop is-visible"
            onClick={onCloseMobileMenu}
            aria-label="Cerrar menú de navegación"
          />
        )}
        <div
          className="dash-content"
          aria-hidden={mobileMenuOpen || undefined}
          inert={mobileMenuOpen || undefined}
        >
          <header className="dash-mobile-header">
            <button
              type="button"
              className="dash-mobile-menu"
              onClick={onOpenMobileMenu}
              aria-label="Abrir menú de navegación"
              aria-controls="navegacion-principal"
              aria-expanded={mobileMenuOpen}
            >
              <IcSidebar size={20} />
            </button>
            <span className="dash-mobile-brand">
              <img src={logoAvisens} alt="AVISENS" width={36} height={36} />
            </span>
            <span className="dash-mobile-location">{titulo}</span>
            <button type="button" className="dash-mobile-search" onClick={openSearch} aria-label="Buscar en Avisens"><IcSearch size={20} /></button>
          </header>
          <div className="dash-acciones-superiores">
            <nav className="dash-topbar-titulo" aria-label="Ubicación">
              <span>{espacio}</span>
              {titulo !== espacio && (
                <>
                  <IcChevronRight size={14} aria-hidden="true" />
                  <strong aria-current="page">{titulo}</strong>
                </>
              )}
            </nav>
            <button type="button" className="dash-topbar-buscar" onClick={openSearch} aria-label="Buscar en Avisens">
              <IcSearch size={16} aria-hidden="true" />
              <span>Buscar en Avisens…</span>
              <kbd aria-hidden="true">{atajo}</kbd>
            </button>
            <CampanaNotificaciones />
            <Link
              to="/perfil"
              className="dash-header-perfil"
              title={usuario?.nombre ? `${usuario.nombre} · ${usuario.rol}` : undefined}
              aria-label="Abrir mi perfil"
            >
              <span className="dash-header-perfil-foto" aria-hidden="true">
                <AvatarUsuario nombre={usuario?.nombre} tamano={40} style={{ width: '100%', height: '100%' }} />
              </span>
              <span className="dash-header-perfil-copy">
                <strong>{usuario?.nombre ?? 'Usuario'}</strong>
                <small>{usuario?.rol ?? ''}</small>
              </span>
            </Link>
          </div>
          <main className="dash-main" ref={panel}>
            <div className="dash-view" key={pathname}>
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      {searchOpen && (
        <Suspense fallback={null}>
          <NavigationSearch sections={sections} rol={rol} onClose={closeSearch} />
        </Suspense>
      )}
    </div>
  )
}

/**
 * Shell de la aplicación interna: sidebar de navegación + área de contenido.
 *
 * Envuelve TODAS las rutas privadas (dashboard, granjas, alertas, etc.) vía
 * <Outlet />. Cada página solo renderiza su propio contenido; el sidebar,
 * el estado de colapso (persistido) y el atajo ⌘B viven aquí, una sola vez.
 */
function PanelLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('avisens.sidebarCollapsed') === '1'
  })
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), [])
  const openMobileMenu = useCallback(() => setMobileMenuOpen(true), [])
  const toggleSidebar = useCallback(() => setSidebarCollapsed((valor) => !valor), [])

  const location = useLocation()
  usePauseOnHidden()

  useEffect(() => {
    window.localStorage.setItem('avisens.sidebarCollapsed', sidebarCollapsed ? '1' : '0')
  }, [sidebarCollapsed])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        setSidebarCollapsed((v) => !v)
      }
      if (e.key === 'Escape') setMobileMenuOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const rol = getRol()

  // Ruta de inicio según el rol: cada experiencia tiene su propio punto de entrada.
  // Esto evita el bucle infinito cuando un rol intenta acceder a una ruta que no le corresponde.
  const rutaInicio = rutaInicioPorRol(rol)

  // Guardia 1: sin sesión iniciada → al login.
  if (!getAccessToken()) {
    return <Navigate to="/login" replace />
  }
  // Guardia 2: el rol no tiene permiso para esta ruta → a su ruta de inicio.
  if (!puedeAcceder(location.pathname, rol)) {
    return <Navigate to={rutaInicio} replace />
  }

  return (
    <PanelShell
      sidebarCollapsed={sidebarCollapsed}
      onToggle={toggleSidebar}
      mobileMenuOpen={mobileMenuOpen}
      onOpenMobileMenu={openMobileMenu}
      onCloseMobileMenu={closeMobileMenu}
      rol={rol}
    />
  )
}

export default PanelLayout
