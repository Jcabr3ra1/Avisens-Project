import { Routes, Route } from 'react-router-dom'
import AppLayout from './layout/AppLayout'
import DashboardLayout from './layout/DashboardLayout'
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
      {/* Página standalone — sin Navbar ni Footer */}
      <Route path="/login" element={<LoginPage />} />

      {/* Páginas públicas con layout */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<LandingPage />} />
      </Route>

      {/* App interna — todas comparten el DashboardLayout (sidebar + shell) */}
      <Route element={<DashboardLayout />}>
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
