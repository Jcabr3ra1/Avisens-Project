// routes.tsx — Define TODAS las rutas de la aplicación.
// Hay 3 grupos: standalone (login), público (landing) e interno (panel + módulos).
// Cada grupo usa su estructura correspondiente (página pública o PanelLayout).
//
// Rutas internas por rol:
//   /admin      → solo Administrador (AdminPage)
//   /dashboard  → solo Propietario (DashboardPage de su granja)
//   /mi-jornada → solo Operario (OperarioPage)
//   resto       → según permisos definidos en navConfig.tsx
import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Routes, Route, useLocation } from 'react-router-dom'
import { getRol } from '@shared/api'
import { ROL_ADMIN } from './layout/Sidebar/navConfig'
import CargaConLogo from '@shared/ui/Animacion/CargaConLogo'

// Cada pantalla se descarga solo cuando el usuario entra a su ruta. Antes se
// enviaban todos los módulos (y todo su CSS) en el primer acceso, aunque la
// mayoría no fueran necesarios para la página actual.
const PanelLayout = lazy(() => import('./layout/PanelLayout'))
const LandingPage = lazy(() => import('@features/landing/LandingPage'))
const LoginPage = lazy(() => import('@features/login/LoginPage'))
const AdminPage = lazy(() => import('@features/admin/AdminPage'))
const DashboardPage = lazy(() => import('@features/dashboard/DashboardPage'))
const CrmPage = lazy(() => import('@features/crm/CrmPage'))
const GuiaCrecimientoPage = lazy(() => import('@features/guia-crecimiento/GuiaCrecimientoPage'))
const MonitoreoPage = lazy(() => import('@features/monitoreo/MonitoreoPage'))
const BitacoraPage = lazy(() => import('@features/bitacora/BitacoraPage'))
const AlertasPage = lazy(() => import('@features/alertas/AlertasPage'))
const FinanzasPage = lazy(() => import('@features/finanzas/FinanzasPage'))
const InventarioPage = lazy(() => import('@features/inventario/InventarioPage'))
const UsuariosPage = lazy(() => import('@features/usuarios/UsuariosPage'))
const GranjasPage = lazy(() => import('@features/granjas/GranjasPage'))
const GalponesPage = lazy(() => import('@features/galpones/GalponesPage'))
const LotesPage = lazy(() => import('@features/lotes/LotesPage'))
const SensoresPage = lazy(() => import('@features/sensores/SensoresPage'))
const OperarioPage = lazy(() => import('@features/operario/OperarioPage'))
const CaptacionPage = lazy(() => import('@features/captacion/CaptacionPage'))
const SolicitudesPqrsPage = lazy(() => import('@features/solicitudes-pqrs/SolicitudesPqrsPage'))
const ProveedoresPage = lazy(() => import('@features/proveedores/ProveedoresPage'))
const OrdenesCompraPage = lazy(() => import('@features/ordenes-compra/OrdenesCompraPage'))
const ConsumosDiariosPage = lazy(() => import('@features/consumos-diarios/ConsumosDiariosPage'))
const NotificacionesPage = lazy(() => import('@features/notificaciones/NotificacionesPage'))
const PerfilPage = lazy(() => import('@features/perfil/PerfilPage'))
const AuditoriaPage = lazy(() => import('@features/auditoria/AuditoriaPage'))
const CatalogosPage = lazy(() => import('@features/catalogos/CatalogosPage'))
const DispositivosPage = lazy(() => import('@features/dispositivos/DispositivosPage'))
const OrganizacionesPage = lazy(() => import('@features/organizaciones/OrganizacionesPage'))
const OrganizacionDetallePage = lazy(() => import('@features/organizaciones/OrganizacionDetallePage'))
const RecuperarPasswordPage = lazy(() => import('@features/recuperaciones-password/RecuperarPasswordPage'))
const CambiarPasswordPage = lazy(() => import('@features/recuperaciones-password/CambiarPasswordPage'))
const RecuperacionesPasswordPage = lazy(() => import('@features/recuperaciones-password/RecuperacionesPasswordPage'))

function cargarPagina(page: ReactNode) {
  return (
    <Suspense fallback={<CargaConLogo />}>
      {page}
    </Suspense>
  )
}

// El administrador consulta el ambiente dentro de cada organización.
// Propietario y Operario conservan la revisión de sus sensores y actuadores.
function MonitoreoPorRol({ seccion }: { seccion: 'sensores' | 'actuadores' }) {
  return getRol() === ROL_ADMIN
    ? <Navigate to="/organizaciones" replace />
    : cargarPagina(<MonitoreoPage seccion={seccion} />)
}

// /monitoreo abre Sensores. Se conserva ?granjaId= de los enlaces existentes.
function MonitoreoInicio() {
  const { search } = useLocation()
  return getRol() === ROL_ADMIN
    ? <Navigate to="/organizaciones" replace />
    : <Navigate to={{ pathname: '/monitoreo/sensores', search }} replace />
}

function AppRoutes() {
  return (
    <Routes>
      {/* GRUPO 1: Standalone — pantalla completa sin layout */}
      <Route path="/login" element={cargarPagina(<LoginPage />)} />
      <Route path="/recuperar-password" element={cargarPagina(<RecuperarPasswordPage />)} />
      <Route path="/cambiar-password" element={cargarPagina(<CambiarPasswordPage />)} />

      {/* GRUPO 2: Web pública — la landing controla sus propios componentes */}
      <Route path="/" element={cargarPagina(<LandingPage />)} />
      <Route path="/contacto" element={cargarPagina(<CaptacionPage />)} />

      {/* GRUPO 3: App interna — con Sidebar lateral (PanelLayout) */}
      {/* PanelLayout verifica sesión y permisos antes de renderizar cada página */}
      <Route element={cargarPagina(<PanelLayout />)}>
        {/* Panel del Administrador — solo accesible con rol 'Administrador' */}
        <Route path="/admin"           element={cargarPagina(<AdminPage />)} />

        {/* Inicio operativo del Propietario y jornada diaria del Operario */}
        <Route path="/dashboard"       element={cargarPagina(<DashboardPage />)} />
        <Route path="/mi-jornada"      element={cargarPagina(<OperarioPage />)} />

        {/* Módulos del sistema — acceso según navConfig.tsx */}
        <Route path="/crm"             element={cargarPagina(<CrmPage />)} />
        <Route path="/guia-crecimiento" element={cargarPagina(<GuiaCrecimientoPage />)} />
        <Route path="/solicitudes-pqrs" element={cargarPagina(<SolicitudesPqrsPage />)} />
        <Route path="/monitoreo"       element={<MonitoreoInicio />} />
        <Route path="/monitoreo/sensores"   element={<MonitoreoPorRol seccion="sensores" />} />
        <Route path="/monitoreo/actuadores" element={<MonitoreoPorRol seccion="actuadores" />} />
        <Route path="/bitacora"        element={cargarPagina(<BitacoraPage />)} />
        <Route path="/consumos-diarios" element={cargarPagina(<ConsumosDiariosPage />)} />
        <Route path="/alertas"         element={cargarPagina(<AlertasPage />)} />
        <Route path="/notificaciones"  element={cargarPagina(<NotificacionesPage />)} />
        <Route path="/perfil"          element={cargarPagina(<PerfilPage />)} />
        <Route path="/finanzas"        element={cargarPagina(<FinanzasPage />)} />
        <Route path="/inventario"      element={cargarPagina(<InventarioPage />)} />
        <Route path="/usuarios"        element={cargarPagina(<UsuariosPage />)} />
        <Route path="/proveedores"     element={cargarPagina(<ProveedoresPage />)} />
        <Route path="/ordenes-compra"  element={cargarPagina(<OrdenesCompraPage />)} />
        <Route path="/recuperaciones-password" element={cargarPagina(<RecuperacionesPasswordPage />)} />
        <Route path="/auditoria"        element={cargarPagina(<AuditoriaPage />)} />
        <Route path="/catalogos"        element={cargarPagina(<CatalogosPage />)} />
        <Route path="/dispositivos"     element={cargarPagina(<DispositivosPage />)} />
        <Route path="/organizaciones"   element={cargarPagina(<OrganizacionesPage />)} />
        <Route path="/organizaciones/:id" element={cargarPagina(<OrganizacionDetallePage />)} />
        <Route path="/granjas"         element={cargarPagina(<GranjasPage />)} />
        <Route path="/galpones"        element={cargarPagina(<GalponesPage />)} />
        <Route path="/lotes"           element={cargarPagina(<LotesPage />)} />
        <Route path="/sensores"        element={cargarPagina(<SensoresPage />)} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default AppRoutes
