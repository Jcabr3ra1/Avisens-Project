import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar/Sidebar'
import { puedeAcceder, ROL_ADMIN, rutaInicioPorRol } from './Sidebar/navConfig'
import { getAccessToken, getRol, getRolVista, guardarRolVista } from '@shared/api'
import { usePauseOnHidden } from '@shared/hooks/usePauseOnHidden'
import ComunicacionPanelProvider from '@features/comunicacion/context/ComunicacionPanelContext'
import { useComunicacionPanel } from '@features/comunicacion/context/comunicacionPanel'
import { IcChat, IcChevronRight } from '@shared/ui/icons/icons'
import './PanelLayout.css'

const ComunicacionPanel = lazy(() => import('@features/comunicacion/components/ComunicacionPanel'))

function PanelShell({
  sidebarCollapsed,
  onToggle,
  rolAutenticado,
  rolVista,
  onCambiarVista,
}: {
  sidebarCollapsed: boolean
  onToggle: () => void
  rolAutenticado: string | null
  rolVista: string | null
  onCambiarVista: (rol: string) => void
}) {
  const { pathname } = useLocation()
  const panel = useRef<HTMLElement>(null)
  const comunicacion = useComunicacionPanel()

  // El panel scrollea por dentro, así que el navegador no restaura la posición
  // al cambiar de ruta: sin esto, la pantalla nueva entra a media altura.
  useEffect(() => {
    panel.current?.scrollTo({ top: 0 })
  }, [pathname])

  const alternarChat = () => {
    if (comunicacion.abierto) {
      comunicacion.cerrar()
      return
    }
    comunicacion.alternar('equipo')
  }

  return (
    <div className={`dash-page${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
      <div className="dash-shell">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={onToggle}
          rolAutenticado={rolAutenticado}
          rolVista={rolVista}
          onCambiarVista={onCambiarVista}
        />
        <main className="dash-main" ref={panel}>
          {/* La `key` fuerza a React a remontar el contenido en cada ruta:
              sin ella la animación de entrada solo correría la primera vez. */}
          <div className="dash-view" key={pathname}>
            {rolAutenticado === ROL_ADMIN && rolVista !== ROL_ADMIN && (
              <div className="dash-vista-previa" role="status">
                <strong>Viendo como {rolVista}</strong>
                <span>Sólo cambia lo que ves. Tu sesión sigue siendo de Administrador y lo que registres aquí es real.</span>
              </div>
            )}
            <Outlet />
          </div>
        </main>
        <aside className={`dash-chat-rail${comunicacion.abierto ? ' dash-chat-rail--open' : ''}`} aria-label="Comunicación">
          <button
            type="button"
            className="dash-chat-rail__toggle"
            onClick={alternarChat}
            aria-expanded={comunicacion.abierto}
            aria-controls="comunicacion-panel"
            aria-label={comunicacion.abierto ? 'Contraer panel de comunicación' : 'Abrir comunicación'}
            title={comunicacion.abierto ? 'Contraer chat' : 'Abrir chat'}
          >
            {comunicacion.abierto ? <IcChevronRight size={21} aria-hidden="true" /> : <IcChat size={25} aria-hidden="true" />}
          </button>
          {comunicacion.abierto && (
            <section className="dash-chat-panel">
            <Suspense fallback={<aside className="comunicacion-panel comunicacion-panel--loading" aria-busy="true" />}>
              <ComunicacionPanel
                abierto={comunicacion.abierto}
                pestanaInicial={comunicacion.pestana}
                galponId={comunicacion.contexto.galponId}
                galponNombre={comunicacion.contexto.galponNombre}
                onCerrar={comunicacion.cerrar}
              />
            </Suspense>
            </section>
          )}
        </aside>
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

  const location = useLocation()
  const navigate = useNavigate()
  const [rolVista, setRolVista] = useState<string | null>(() => getRolVista())
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

  const rol = getRol()

  // Ruta de inicio según el rol: el Admin va a su panel; los demás al dashboard operativo.
  // Esto evita el bucle infinito cuando un rol intenta acceder a una ruta que no le corresponde.
  const rutaInicio = rutaInicioPorRol(rol)

  const cambiarVista = (siguienteRol: string) => {
    if (rol !== ROL_ADMIN) return
    guardarRolVista(siguienteRol)
    setRolVista(siguienteRol)
    navigate(rutaInicioPorRol(siguienteRol))
  }

  // Guardia 1: sin sesión iniciada → al login.
  if (!getAccessToken()) {
    return <Navigate to="/login" replace />
  }
  // Guardia 2: el rol no tiene permiso para esta ruta → a su ruta de inicio.
  const accesoPorVistaPrevia = rol === ROL_ADMIN && puedeAcceder(location.pathname, rolVista)
  if (!puedeAcceder(location.pathname, rol) && !accesoPorVistaPrevia) {
    return <Navigate to={rutaInicio} replace />
  }

  return (
    <ComunicacionPanelProvider>
      <PanelShell
        sidebarCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
        rolAutenticado={rol}
        rolVista={rolVista}
        onCambiarVista={cambiarVista}
      />
    </ComunicacionPanelProvider>
  )
}

export default PanelLayout
