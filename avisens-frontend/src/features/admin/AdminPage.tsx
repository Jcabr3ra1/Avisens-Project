import { useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import * as Tooltip from '@radix-ui/react-tooltip'
import { toast } from 'sonner'
import { getUsuario } from '@shared/api'
import AdminHero from './components/AdminHero'
import DestacadoAtencion from './components/DestacadoAtencion'
import TarjetaIndicadorAdmin from './components/TarjetaIndicadorAdmin'
import PanelActividadAdmin from './components/PanelActividadAdmin'
import PanelAtencionAdmin from './components/PanelAtencionAdmin'
import PanelCrmAdmin from './components/PanelCrmAdmin'
import PanelOrganizacionesAdmin from './components/PanelOrganizacionesAdmin'
import PanelSaludAdmin from './components/PanelSaludAdmin'
import { useConectividad } from './hooks/useConectividad'
import { useAdminDatos } from './hooks/useAdminDatos'
import { useResumenAdmin } from './hooks/useResumenAdmin'
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
  const fecha = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
  const activas = organizaciones.filter((organizacion) => organizacion.activa).length
  const sinSenal = conectividad ? conectividad.sin_reportar + conectividad.nunca : 0

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

  function verBandeja() {
    document.getElementById('admin-bandeja')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <Tooltip.Provider delayDuration={250} skipDelayDuration={100}>
      <div className="page-container admin-page cdc">
        <AdminHero
          nombre={usuario?.nombre?.split(' ')[0] ?? 'Administrador'}
          fecha={fecha}
          sincronizando={sincronizando}
          onSincronizar={() => void handleSincronizar()}
        />

        {errorResumen && (
          <div className="cdc-error" role="alert">
            <span>{errorResumen}</span>
            <button type="button" onClick={() => void recargarResumen()}>Reintentar</button>
          </div>
        )}

        <section className="cdc-pulso" aria-label="Pulso de la plataforma">
          <DestacadoAtencion
            {...resumen.atencion}
            cargando={cargandoAtencion}
            onAbrir={(item) => navigate(item.ruta)}
            onVerBandeja={verBandeja}
          />
          <TarjetaIndicadorAdmin
            indice={1}
            etiqueta="Organizaciones"
            icono="carpetas"
            valor={activas}
            total={organizaciones.length}
            detalle={activas === organizaciones.length ? 'Todas con operación activa' : `${organizaciones.length - activas} suspendidas`}
            segmentos={[
              { etiqueta: 'Activas', valor: activas, tono: 'bosque' },
              { etiqueta: 'Suspendidas', valor: organizaciones.length - activas, tono: 'neutro' },
            ]}
            cargando={cargandoGestion}
            accion="Abrir el directorio de organizaciones"
            onAbrir={() => navigate('/organizaciones')}
          />
          <TarjetaIndicadorAdmin
            indice={2}
            etiqueta="Personas"
            icono="grupos"
            valor={usuarios.length}
            detalle={`${resumen.totalActivos} con acceso activo`}
            segmentos={[
              { etiqueta: 'Propietarios', valor: resumen.totalPropietarios, tono: 'bosque' },
              { etiqueta: 'Operarios', valor: resumen.totalOperarios, tono: 'salvia' },
              { etiqueta: 'Admin', valor: resumen.totalAdministradores, tono: 'maiz' },
            ]}
            cargando={cargandoGestion}
            accion="Abrir personas y accesos"
            onAbrir={() => navigate('/usuarios')}
          />
          <TarjetaIndicadorAdmin
            indice={3}
            etiqueta="Controladores"
            icono="servidor"
            valor={conectividad?.conectados ?? null}
            total={conectividad?.total ?? null}
            detalle={
              errorConectividad ? 'Estado no disponible'
                : !conectividad || conectividad.total === 0 ? 'Ninguno instalado'
                  : sinSenal === 0 ? `Todos reportan (últimos ${conectividad.ventana_minutos} min)`
                    : `${sinSenal} sin señal reciente`
            }
            segmentos={[
              { etiqueta: 'En línea', valor: conectividad?.conectados ?? 0, tono: 'bosque' },
              { etiqueta: 'Sin reportar', valor: conectividad?.sin_reportar ?? 0, tono: 'maiz' },
              { etiqueta: 'Nunca', valor: conectividad?.nunca ?? 0, tono: 'peligro' },
            ]}
            aviso={sinSenal > 0}
            cargando={cargandoConectividad && !conectividad}
            accion="Abrir dispositivos"
            onAbrir={() => navigate('/dispositivos')}
          />
        </section>

        <div className="cdc-fila cdc-fila--operacion">
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
          <PanelSaludAdmin
            conectividad={conectividad}
            cargando={cargandoConectividad}
            error={errorConectividad}
            onReintentar={() => void recargarConectividad()}
            onAbrirOrganizacion={(id) => navigate(`/organizaciones/${id}`)}
            onIrDispositivos={() => navigate('/dispositivos')}
          />
        </div>

        <div className="cdc-entra" style={{ '--i': 7 } as CSSProperties}>
          <PanelOrganizacionesAdmin
            organizaciones={organizaciones}
            cargando={cargandoGestion}
            onAbrirOrganizacion={(id) => navigate(`/organizaciones/${id}`)}
            onVerTodas={() => navigate('/organizaciones')}
            onIrCrm={() => navigate('/crm')}
          />
        </div>

        <div className="cdc-fila">
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
