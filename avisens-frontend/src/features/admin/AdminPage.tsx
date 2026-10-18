import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as Tooltip from '@radix-ui/react-tooltip'
import { toast } from 'sonner'
import { getUsuario } from '@shared/api'
import AdminHero from './components/AdminHero'
import PanelActividadAdmin from './components/PanelActividadAdmin'
import PanelAtencionAdmin from './components/PanelAtencionAdmin'
import PanelCrmAdmin from './components/PanelCrmAdmin'
import PanelOrganizacionesAdmin from './components/PanelOrganizacionesAdmin'
import PanelSaludAdmin from './components/PanelSaludAdmin'
import { useConectividad } from './hooks/useConectividad'
import { useAdminDatos } from './hooks/useAdminDatos'
import { useResumenAdmin } from './hooks/useResumenAdmin'
import type { KpiAdmin } from './model/adminResumen'
import '@shared/ui/admin/CentroControl.css'
import './AdminPage.css'

function AdminPage() {
  const navigate = useNavigate()
  const usuario = getUsuario()
  const [sincronizando, setSincronizando] = useState(false)
  const {
    usuarios,
    organizaciones,
    prospectos,
    atencion,
    cargandoGestion,
    cargandoCrm,
    cargandoAtencion,
    errorAtencion,
    errorResumen,
    recargarResumen,
    recargarAtencion,
  } = useAdminDatos()
  const { conectividad, cargando: cargandoConectividad, error: errorConectividad, recargar: recargarConectividad } = useConectividad()
  const resumen = useResumenAdmin({ usuarios, organizaciones, prospectos, conectividad, errorConectividad, atencion })
  const fecha = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  async function handleSincronizar() {
    if (sincronizando) return
    setSincronizando(true)
    try {
      await Promise.all([recargarResumen(), recargarAtencion(), recargarConectividad()])
      toast.success('Indicadores actualizados')
    } catch {
      toast.error('No se pudieron sincronizar todos los indicadores')
    } finally {
      setSincronizando(false)
    }
  }

  function handleNavegarKpi(icono: KpiAdmin['icono']) {
    if (icono === 'sensor') {
      document.getElementById('admin-salud')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else if (icono === 'organizacion') {
      navigate('/organizaciones')
    } else if (icono === 'usuarios') {
      navigate('/usuarios')
    } else if (
      resumen.atencion.solicitudesPendientes === 0 &&
      resumen.atencion.recuperacionesPendientes > 0
    ) {
      navigate('/recuperaciones-password')
    } else {
      navigate('/solicitudes-pqrs')
    }
  }

  return (
    <Tooltip.Provider delayDuration={250} skipDelayDuration={100}>
      <div className="page-container admin-page">
        <AdminHero
          nombre={usuario?.nombre?.split(' ')[0] ?? 'Administrador'}
          fecha={fecha}
          kpis={resumen.kpis}
          cargando={cargandoGestion || cargandoConectividad}
          sincronizando={sincronizando}
          onSincronizar={() => void handleSincronizar()}
          onNavegarKpi={handleNavegarKpi}
        />

        {errorResumen && (
          <div className="adm-alerta" role="alert">
            <span>{errorResumen}</span>
            <button type="button" onClick={() => void recargarResumen()}>
              Reintentar
            </button>
          </div>
        )}

        <div className="admin-primary-grid">
          <PanelAtencionAdmin
            {...resumen.atencion}
            cargando={cargandoAtencion}
            error={errorAtencion}
            onAbrir={(item) => navigate(item.ruta)}
            onReintentar={() => void recargarAtencion()}
            onIrAlertas={() => navigate('/alertas')}
            onIrPqrs={() => navigate('/solicitudes-pqrs')}
            onIrRecuperaciones={() => navigate('/recuperaciones-password')}
          />

          <PanelOrganizacionesAdmin
            organizaciones={organizaciones}
            cargando={cargandoGestion}
            onAbrirOrganizacion={(id) => navigate(`/organizaciones/${id}`)}
            onVerTodas={() => navigate('/organizaciones')}
            onIrCrm={() => navigate('/crm')}
          />
        </div>

        <PanelSaludAdmin
          conectividad={conectividad}
          cargando={cargandoConectividad}
          error={errorConectividad}
          onReintentar={() => void recargarConectividad()}
          onAbrirOrganizacion={(id) => navigate(`/organizaciones/${id}`)}
        />

        <div className="admin-secondary-grid">
          <PanelCrmAdmin
            etapas={resumen.etapasCrm}
            recientes={resumen.prospectosRecientes}
            total={resumen.totalProspectos}
            cargando={cargandoCrm}
            conversion={resumen.conversionCrm}
            onGestionar={() => navigate('/crm')}
            onAbrirProspecto={(id) => navigate(`/crm?prospecto=${id}`)}
          />

          <PanelActividadAdmin
            usuarios={resumen.actividadReciente}
            total={usuarios.length}
            propietarios={resumen.totalPropietarios}
            operarios={resumen.totalOperarios}
            administradores={resumen.totalAdministradores}
            activos={resumen.totalActivos}
            cargando={cargandoGestion}
            onGestionar={(rol) => navigate(rol ? `/usuarios?rol=${rol}` : '/usuarios')}
          />
        </div>
      </div>
    </Tooltip.Provider>
  )
}

export default AdminPage
