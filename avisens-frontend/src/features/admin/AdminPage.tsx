import { useNavigate } from 'react-router-dom'
import { getUsuario } from '@shared/api'
import { useMonitoreoAmbiental } from '@features/monitoreo/hooks/useMonitoreoAmbiental'
import AccionesAdmin from './components/AccionesAdmin'
import AdminHero from './components/AdminHero'
import PanelActividadAdmin from './components/PanelActividadAdmin'
import PanelCrmAdmin from './components/PanelCrmAdmin'
import PanelAtencionAdmin from './components/PanelAtencionAdmin'
import { useAdminDatos } from './hooks/useAdminDatos'
import { useResumenAdmin } from './hooks/useResumenAdmin'
import './AdminPage.css'

function AdminPage() {
  const navigate = useNavigate()
  const usuario = getUsuario()
  const {
    usuarios,
    granjas,
    prospectos,
    atencion,
    cargandoGestion,
    cargandoCrm,
    cargandoAtencion,
    errorAtencion,
    recargarAtencion,
  } = useAdminDatos()
  const { galpones, cargando: cargandoMonitoreo } = useMonitoreoAmbiental()
  const resumen = useResumenAdmin({ usuarios, granjas, prospectos, galpones, atencion })
  const fecha = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="page-container admin-page">
      <AdminHero
        nombre={usuario?.nombre?.split(' ')[0] ?? 'Administrador'}
        fecha={fecha}
        kpis={resumen.kpis}
        cargando={cargandoGestion || cargandoMonitoreo}
      />

      <div className="admin-primary-grid">
        <PanelAtencionAdmin
          {...resumen.atencion}
          cargando={cargandoAtencion}
          error={errorAtencion}
          onAbrir={(item) => navigate(item.ruta)}
          onReintentar={() => void recargarAtencion()}
        />
        <PanelActividadAdmin
          usuarios={resumen.actividadReciente}
          total={usuarios.length}
          propietarios={resumen.totalPropietarios}
          operarios={resumen.totalOperarios}
          activos={resumen.totalActivos}
          cargando={cargandoGestion}
          onGestionar={() => navigate('/usuarios')}
        />
      </div>

      <div className="admin-secondary-grid">
        <PanelCrmAdmin
          etapas={resumen.etapasCrm}
          cargando={cargandoCrm}
          conversion={resumen.conversionCrm}
          onGestionar={() => navigate('/crm')}
        />
        <AccionesAdmin
          onUsuarios={() => navigate('/usuarios')}
          onGranjas={() => navigate('/granjas')}
          onCrm={() => navigate('/crm')}
          onProveedores={() => navigate('/proveedores')}
          onCompras={() => navigate('/ordenes-compra')}
        />
      </div>

    </div>
  )
}

export default AdminPage
