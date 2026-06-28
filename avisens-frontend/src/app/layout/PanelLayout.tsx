import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar/Sidebar'
import { puedeAcceder } from './Sidebar/navConfig'
import { getAccessToken, getRol } from '@shared/api'
import { GALPONES } from '@shared/data/farm'
import { usePauseOnHidden } from '@shared/hooks/usePauseOnHidden'
import './PanelLayout.css'

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
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const totalAves = GALPONES.reduce((acc, g) => acc + g.aves, 0)
  const totalAlertas = GALPONES.reduce((acc, g) => acc + g.alertas, 0)
  const galponesActivos = GALPONES.filter((g) => g.status !== 'empty').length

  const rol = getRol()

  // Guardia 1: sin sesión iniciada -> al login.
  if (!getAccessToken()) {
    return <Navigate to="/login" replace />
  }
  // Guardia 2: el rol no tiene permiso para esta ruta -> al dashboard.
  if (!puedeAcceder(location.pathname, rol)) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className={`dash-page${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
        rol={rol}
        galponesActivos={galponesActivos}
        totalAves={totalAves}
        totalAlertas={totalAlertas}
      />
      <main className="dash-main">
        <Outlet />
      </main>
    </div>
  )
}

export default PanelLayout
