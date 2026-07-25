import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar/Sidebar'
import { puedeAcceder, ROL_ADMIN } from './Sidebar/navConfig'
import { getAccessToken, getRol } from '@shared/api'
import { GALPONES } from '@shared/data/farm'
import { GALPONES_MONITOREO } from '../../features/monitoreo/data'
import { usePauseOnHidden } from '@shared/hooks/usePauseOnHidden'
import { useLecturasVivas } from '@shared/hooks/useLecturasVivas'
import { calcularEstadoSensor } from '@shared/utils/sensores'
import './PanelLayout.css'

// GP-01 es el único galpón con un ESP32 conectado (ver Monitoreo/Alertas).
const CODIGO_GALPON_CON_ESP32 = 'GP-01'
const UMBRAL_DESCONEXION_MS = 3 * 60 * 1000

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
  const galponesActivos = GALPONES.filter((g) => g.status !== 'empty').length

  // Cuenta de alertas activas EN VIVO — igual regla que usa AlertasPage: por
  // cada galpón, cada sensor fuera de rango (real para GP-01 si ya llegó un
  // valor de Firebase, mock para el resto) cuenta como una alerta. Antes este
  // número salía de un campo fijo en shared/data/farm.ts que se podía
  // desincronizar del conteo real que muestra la página de Alertas — ahora
  // los dos leen la misma fuente, así que nunca pueden mostrar números distintos.
  const lecturasVivasGP01 = useLecturasVivas(CODIGO_GALPON_CON_ESP32)
  let totalAlertas = 0
  for (const galpon of GALPONES_MONITOREO) {
    for (const sensor of galpon.sensores) {
      if (sensor.estado === 'offline') continue
      const vivo = galpon.codigo === CODIGO_GALPON_CON_ESP32 ? lecturasVivasGP01[sensor.variable] : undefined
      const valor  = vivo ? vivo.valor : sensor.valor
      const estado = calcularEstadoSensor(valor, sensor.minUmbral, sensor.maxUmbral)
      if (estado !== 'optimo') totalAlertas++
    }
  }
  const tsUltimaLecturaGP01 =
    lecturasVivasGP01.temperatura?.ts ?? lecturasVivasGP01.humedad?.ts ?? lecturasVivasGP01.co2?.ts
  if (tsUltimaLecturaGP01 && Date.now() - tsUltimaLecturaGP01 > UMBRAL_DESCONEXION_MS) {
    totalAlertas++ // la alerta de "conexión del sensor" que también genera AlertasPage
  }

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
