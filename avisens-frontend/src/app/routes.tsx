// routes.tsx — Define TODAS las rutas de la aplicación.
// Hay 3 grupos: standalone (login), público (landing) e interno (panel + módulos).
// Cada grupo usa su estructura correspondiente (página pública o PanelLayout).
//
// Rutas internas por rol:
//   /admin      → solo Administrador (AdminPage)
//   /dashboard  → Propietario y Operario (DashboardPage operativo)
//   resto       → según permisos definidos en navConfig.tsx
import { lazy, Suspense, type ReactNode } from 'react'
import { Routes, Route } from 'react-router-dom'

// Cada pantalla se descarga solo cuando el usuario entra a su ruta. Antes se
// enviaban todos los módulos (y todo su CSS) en el primer acceso, aunque la
// mayoría no fueran necesarios para la página actual.
const PanelLayout = lazy(() => import('./layout/PanelLayout'))
const LandingPage = lazy(() => import('@features/landing/LandingPage'))
const LoginPage = lazy(() => import('@features/login/LoginPage'))
const AdminPage = lazy(() => import('@features/admin/AdminPage'))
const DashboardPage = lazy(() => import('@features/dashboard/DashboardPage'))
const CrmPage = lazy(() => import('@features/crm/CrmPage'))
const MonitoreoPage = lazy(() => import('@features/monitoreo/MonitoreoPage'))
const BitacoraPage = lazy(() => import('@features/bitacora/BitacoraPage'))
const AlertasPage = lazy(() => import('@features/alertas/AlertasPage'))
const FinanzasPage = lazy(() => import('@features/finanzas/FinanzasPage'))
const InventarioPage = lazy(() => import('@features/inventario/InventarioPage'))
const InfraestructuraPage = lazy(() => import('@features/infraestructura/InfraestructuraPage'))
const UsuariosPage = lazy(() => import('@features/usuarios/UsuariosPage'))
const GranjasPage = lazy(() => import('@features/granjas/GranjasPage'))
const SensoresPage = lazy(() => import('@features/sensores/SensoresPage'))

function cargarPagina(page: ReactNode) {
  return (
    <Suspense fallback={<div className="route-loading" role="status">Cargando…</div>}>
      {page}
    </Suspense>
  )
}

function AppRoutes() {
  return (
    <Routes>
      {/* GRUPO 1: Standalone — pantalla completa sin layout */}
      <Route path="/login" element={cargarPagina(<LoginPage />)} />

      {/* GRUPO 2: Web pública — la landing controla sus propios componentes */}
      <Route path="/" element={cargarPagina(<LandingPage />)} />

      {/* GRUPO 3: App interna — con Sidebar lateral (PanelLayout) */}
      {/* PanelLayout verifica sesión y permisos antes de renderizar cada página */}
      <Route element={cargarPagina(<PanelLayout />)}>
        {/* Panel del Administrador — solo accesible con rol 'Administrador' */}
        <Route path="/admin"           element={cargarPagina(<AdminPage />)} />

        {/* Dashboard operativo — para Propietario y Operario */}
        <Route path="/dashboard"       element={cargarPagina(<DashboardPage />)} />

        {/* Módulos del sistema — acceso según navConfig.tsx */}
        <Route path="/crm"             element={cargarPagina(<CrmPage />)} />
        <Route path="/monitoreo"       element={cargarPagina(<MonitoreoPage />)} />
        <Route path="/bitacora"        element={cargarPagina(<BitacoraPage />)} />
        <Route path="/alertas"         element={cargarPagina(<AlertasPage />)} />
        <Route path="/finanzas"        element={cargarPagina(<FinanzasPage />)} />
        <Route path="/inventario"      element={cargarPagina(<InventarioPage />)} />
        <Route path="/infraestructura" element={cargarPagina(<InfraestructuraPage />)} />
        <Route path="/usuarios"        element={cargarPagina(<UsuariosPage />)} />
        <Route path="/granjas"         element={cargarPagina(<GranjasPage />)} />
        <Route path="/sensores"        element={cargarPagina(<SensoresPage />)} />
      </Route>
    </Routes>
  )
}

export default AppRoutes
