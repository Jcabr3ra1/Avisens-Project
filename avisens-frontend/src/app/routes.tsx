// routes.tsx — Define TODAS las rutas de la aplicación
// Hay 3 grupos: standalone (login), público (landing) e interno (dashboard + módulos)
// Cada grupo usa un layout diferente (sin layout, AppLayout, PanelLayout)
import { Routes, Route } from 'react-router-dom'
import AppLayout from './layout/AppLayout'
import PanelLayout from './layout/PanelLayout'
import LandingPage from '@features/landing/LandingPage'
import LoginPage from '@features/login/LoginPage'
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

function AppRoutes() {
  return (
    <Routes>
      {/* GRUPO 1: Standalone — pantalla completa sin layout */}
      <Route path="/login" element={<LoginPage />} />

      {/* GRUPO 2: Web pública — con Navbar + Footer + FloatChat */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<LandingPage />} />
      </Route>

      {/* GRUPO 3: App interna — con Sidebar lateral (PanelLayout) */}
      {/* Todas las páginas internas comparten el mismo sidebar */}
      <Route element={<PanelLayout />}>
        <Route path="/dashboard"       element={<DashboardPage />} />
        <Route path="/crm"             element={<CrmPage />} />
        <Route path="/monitoreo"       element={<MonitoreoPage />} />
        <Route path="/bitacora"        element={<BitacoraPage />} />
        <Route path="/alertas"         element={<AlertasPage />} />
        <Route path="/finanzas"        element={<FinanzasPage />} />
        <Route path="/inventario"      element={<InventarioPage />} />
        <Route path="/infraestructura" element={<InfraestructuraPage />} />
        <Route path="/usuarios"        element={<UsuariosPage />} />
        <Route path="/granjas"         element={<GranjasPage />} />
      </Route>
    </Routes>
  )
}

export default AppRoutes
