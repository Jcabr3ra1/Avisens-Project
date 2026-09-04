import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar/Sidebar'
import { puedeAcceder, rutaInicioPorRol } from './Sidebar/navConfig'
import { getAccessToken, getRol } from '@shared/api'
import { usePauseOnHidden } from '@shared/hooks/usePauseOnHidden'
import { IcSidebar } from '@shared/ui/icons/icons'
import logoAvisens from '@shared/assets/logo-avisens.png'
import './PanelLayout.css'

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
          rol={rol}
        />
        <button
          type="button"
          className={`dash-sidebar-backdrop${mobileMenuOpen ? ' is-visible' : ''}`}
          onClick={onCloseMobileMenu}
          aria-label="Cerrar menú de navegación"
          tabIndex={mobileMenuOpen ? 0 : -1}
        />
        <div className="dash-content">
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
              <img src={logoAvisens} alt="" />
              AVISENS
            </span>
          </header>
          <main className="dash-main" ref={panel}>
            <div className="dash-view" key={pathname}>
              <Outlet />
            </div>
          </main>
        </div>
      </div>
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
