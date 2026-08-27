// routes.tsx — Define TODAS las rutas de la aplicación.
// Hay 3 grupos: standalone (login), público (landing) e interno (panel + módulos).
// Cada grupo usa su estructura correspondiente (página pública o PanelLayout).
//
// Rutas internas por rol:
//   /admin      → solo Administrador (AdminPage)
//   /dashboard  → Propietario y Operario (DashboardPage operativo)
//   resto       → según permisos definidos en navConfig.tsx
import { Routes, Route } from 'react-router-dom'
import PanelLayout from './layout/PanelLayout'
import LandingPage from '@features/landing/LandingPage'
import LoginPage from '@features/login/LoginPage'
import AdminPage from '@features/admin/AdminPage'          // Panel exclusivo del Administrador
import DashboardPage from '@features/dashboard/DashboardPage'
import CrmPage from '@features/crm/CrmPage'
import MonitoreoPage from '@features/monitoreo/MonitoreoPage'
import BitacoraPage from '@features/bitacora/BitacoraPage'
import AlertasPage from '@features/alertas/AlertasPage'
import FinanzasPage from '@features/finanzas/FinanzasPage'
import InventarioPage from '@features/inventario/InventarioPage'
import InfraestructuraPage from '@features/infraestructura/InfraestructuraPage'
import UsuariosPage from '@features/usuarios/UsuariosPage'
import GranjasPage from '@features/granjas/GranjasPage'
import SensoresPage from '@features/sensores/SensoresPage'

function AppRoutes() {
  return (
    <Routes>
      {/* GRUPO 1: Standalone — pantalla completa sin layout */}
      <Route path="/login" element={<LoginPage />} />

      {/* GRUPO 2: Web pública — la landing controla sus propios componentes */}
      <Route path="/" element={<LandingPage />} />

      {/* GRUPO 3: App interna — con Sidebar lateral (PanelLayout) */}
      {/* PanelLayout verifica sesión y permisos antes de renderizar cada página */}
      <Route element={<PanelLayout />}>
        {/* Panel del Administrador — solo accesible con rol 'Administrador' */}
        <Route path="/admin"           element={<AdminPage />} />

        {/* Dashboard operativo — para Propietario y Operario */}
        <Route path="/dashboard"       element={<DashboardPage />} />

        {/* Módulos del sistema — acceso según navConfig.tsx */}
        <Route path="/crm"             element={<CrmPage />} />
        <Route path="/monitoreo"       element={<MonitoreoPage />} />
        <Route path="/bitacora"        element={<BitacoraPage />} />
        <Route path="/alertas"         element={<AlertasPage />} />
        <Route path="/finanzas"        element={<FinanzasPage />} />
        <Route path="/inventario"      element={<InventarioPage />} />
        <Route path="/infraestructura" element={<InfraestructuraPage />} />
        <Route path="/usuarios"        element={<UsuariosPage />} />
        <Route path="/granjas"         element={<GranjasPage />} />
        <Route path="/sensores"        element={<SensoresPage />} />
      </Route>
    </Routes>
  )
}

export default AppRoutes
