import { useNavigate } from 'react-router-dom'
import { getUsuario } from '@shared/api'
import { useMonitoreoAmbiental } from '@shared/hooks/useMonitoreoAmbiental'
import AccionesAdmin from './components/AccionesAdmin'
import AdminHero from './components/AdminHero'
import ControlGranjas from './components/ControlGranjas'
import PanelActividadAdmin from './components/PanelActividadAdmin'
import PanelCrmAdmin from './components/PanelCrmAdmin'
import { useAdminDatos } from './hooks/useAdminDatos'
import { useResumenAdmin } from './hooks/useResumenAdmin'
import './AdminPage.css'

function AdminPage() {
  const navigate = useNavigate()
  const usuario = getUsuario()
  const { usuarios, granjas, prospectos, cargandoGestion, cargandoCrm } = useAdminDatos()
  const { galpones } = useMonitoreoAmbiental()
  const resumen = useResumenAdmin({ usuarios, granjas, prospectos, galpones })
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
      />

      <div className="admin-mid-row">
        <PanelCrmAdmin
          etapas={resumen.etapasCrm}
          cargando={cargandoCrm}
          conversion={resumen.conversionCrm}
          onGestionar={() => navigate('/crm')}
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

      <ControlGranjas
        propietarios={resumen.resumenPropietarios}
        propietariosSinGranja={resumen.propietariosSinGranja}
        cargando={cargandoGestion}
        onGestionar={() => navigate('/granjas')}
      />

      <AccionesAdmin
        onUsuarios={() => navigate('/usuarios')}
        onGranjas={() => navigate('/granjas')}
        onGalpones={() => navigate('/galpones')}
        onCrm={() => navigate('/crm')}
        onSolicitudes={() => navigate('/solicitudes-pqrs')}
        onProveedores={() => navigate('/proveedores')}
        onCompras={() => navigate('/ordenes-compra')}
      />
    </div>
  )
}

export default AdminPage
