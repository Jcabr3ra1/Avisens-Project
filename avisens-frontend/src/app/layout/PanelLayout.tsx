import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar/Sidebar'
import { puedeAcceder, ROL_ADMIN } from './Sidebar/navConfig'
import { getAccessToken, getRol } from '@shared/api'
import { useMonitoreoAmbiental } from '@shared/hooks/useMonitoreoAmbiental'
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

  // Contadores del sidebar EN VIVO — misma fuente y misma regla que usan
  // Monitoreo y Alertas, así que nunca pueden mostrar números distintos.
  const { galpones } = useMonitoreoAmbiental()
  const totalAves = galpones.reduce((acc, g) => acc + (g.loteActivo?.cantidad_inicial ?? 0), 0)
  const galponesActivos = galpones.filter((g) => g.loteActivo !== null).length
  const totalAlertas = galpones.reduce(
    (acc, g) => acc + g.sensores.filter((s) => s.estado === 'advertencia' || s.estado === 'critico').length,
    0,
  )

  const rol = getRol()

  // Ruta de inicio según el rol: el Admin va a su panel; los demás al dashboard operativo.
  // Esto evita el bucle infinito cuando un rol intenta acceder a una ruta que no le corresponde.
  const rutaInicio = rol === ROL_ADMIN ? '/admin' : '/dashboard'

  // Guardia 1: sin sesión iniciada → al login.
  if (!getAccessToken()) {
    return <Navigate to="/login" replace />
  }
  // Guardia 2: el rol no tiene permiso para esta ruta → a su ruta de inicio.
  if (!puedeAcceder(location.pathname, rol)) {
    return <Navigate to={rutaInicio} replace />
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
