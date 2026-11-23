import { useCallback, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import * as Tooltip from '@radix-ui/react-tooltip'
import { getUsuario } from '@shared/api'
import { useRefetchOnFocus } from '@shared/hooks/useRefetchOnFocus'
import AdminHero from './components/AdminHero'
import DestacadoAtencion from './components/DestacadoAtencion'
import TarjetaKpiAdmin from './components/TarjetaKpiAdmin'
import PanelActividadPlataforma from './components/PanelActividadPlataforma'
import PanelCrecimiento from './components/PanelCrecimiento'
import PanelMortalidad from './components/PanelMortalidad'
import PanelActividadAdmin from './components/PanelActividadAdmin'
import PanelAtencionAdmin from './components/PanelAtencionAdmin'
import PanelCrmAdmin from './components/PanelCrmAdmin'
import PanelOrganizacionesAdmin from './components/PanelOrganizacionesAdmin'
import PanelSaludAdmin from './components/PanelSaludAdmin'
import { useConectividad } from './hooks/useConectividad'
import { useAdminDatos } from './hooks/useAdminDatos'
import { useResumenAdmin } from './hooks/useResumenAdmin'
import { useMetricasAdmin } from './hooks/useMetricasAdmin'
import { acumularCampo, calcularDelta, sumarCampo, type PeriodoDias } from './model/metricas'
import './AdminPage.css'
import './AdminMetricas.css'

function AdminPage() {
  const navigate = useNavigate()
  const usuario = getUsuario()
  const [periodo, setPeriodo] = useState<PeriodoDias>(30)
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
  const { metricas, cargando: cargandoMetricas, error: errorMetricas, recargar: recargarMetricas } = useMetricasAdmin(periodo)
  const recargarTodoAdmin = useCallback(() => {
    void Promise.all([recargarResumen(), recargarAtencion(), recargarConectividad(), recargarMetricas()])
  }, [recargarResumen, recargarAtencion, recargarConectividad, recargarMetricas])
  useRefetchOnFocus(recargarTodoAdmin)
  const resumen = useResumenAdmin({ usuarios, organizaciones, prospectos, conectividad, errorConectividad, atencion })
  const fecha = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
  const activas = organizaciones.filter((organizacion) => organizacion.activa).length
  const sinSenal = conectividad ? conectividad.sin_reportar + conectividad.nunca : 0

  const series = metricas?.series ?? []
  const anterior = metricas?.periodo_anterior
  const deltaOrganizaciones = metricas && anterior ? calcularDelta(sumarCampo(series, 'organizaciones_nuevas'), anterior.organizaciones_nuevas, periodo, true) : null
  const deltaPersonas = metricas && anterior ? calcularDelta(sumarCampo(series, 'usuarios_nuevos'), anterior.usuarios_nuevos, periodo, true) : null
  const muertesPeriodo = sumarCampo(series, 'aves_muertas')
  const deltaAves = metricas && anterior ? calcularDelta(muertesPeriodo, anterior.aves_muertas, periodo, false, 'muertes') : null

  function verBandeja() {
    document.getElementById('admin-bandeja')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <Tooltip.Provider delayDuration={250} skipDelayDuration={100}>
      <div className="page-container admin-page cdc">
        <AdminHero
          nombre={usuario?.nombre?.split(' ')[0] ?? 'Administrador'}
          fecha={fecha}
          periodo={periodo}
          onCambiarPeriodo={setPeriodo}
        />

        {errorResumen && (
          <div className="cdc-error" role="alert">
            <span>{errorResumen}</span>
            <button type="button" onClick={() => void recargarResumen()}>Reintentar</button>
          </div>
        )}

        <section className="cdc-pulso cdc-pulso--kpis" aria-label="Pulso de la plataforma">
          <DestacadoAtencion
            {...resumen.atencion}
            cargando={cargandoAtencion}
            onAbrir={(item) => navigate(item.ruta)}
            onVerBandeja={verBandeja}
          />
          <div className="cdc-kpis">
            <TarjetaKpiAdmin
              id="organizaciones"
              indice={1}
              etiqueta="Organizaciones"
              icono="carpetas"
              valor={activas}
              total={organizaciones.length}
              detalle={activas === organizaciones.length ? 'Todas con operación activa' : `${organizaciones.length - activas} suspendidas`}
              delta={deltaOrganizaciones}
              serie={metricas ? acumularCampo(series, 'organizaciones_nuevas') : null}
              colorSerie="var(--avisens-deep)"
              cargando={cargandoGestion}
              cargandoSerie={cargandoMetricas}
              accion="Abrir el directorio de organizaciones"
              onAbrir={() => navigate('/organizaciones')}
            />
            <TarjetaKpiAdmin
              id="personas"
              indice={2}
              etiqueta="Personas"
              icono="grupos"
              valor={usuarios.length}
              detalle={`${resumen.totalActivos} con acceso activo`}
              delta={deltaPersonas}
              serie={metricas ? acumularCampo(series, 'usuarios_nuevos') : null}
              colorSerie="var(--cdc-tono-salvia)"
              cargando={cargandoGestion}
              cargandoSerie={cargandoMetricas}
              accion="Abrir personas y accesos"
              onAbrir={() => navigate('/usuarios')}
            />
            <TarjetaKpiAdmin
              id="aves"
              indice={3}
              etiqueta="Aves en producción"
              icono="grafico"
              valor={metricas?.actuales.aves_en_produccion ?? null}
              detalle={
                errorMetricas ? 'Métricas no disponibles'
                  : metricas ? `${metricas.actuales.lotes_activos} ${metricas.actuales.lotes_activos === 1 ? 'lote activo' : 'lotes activos'} · ${muertesPeriodo} muertes en el periodo`
                    : 'Consultando…'
              }
              delta={deltaAves}
              serie={metricas ? series.map((punto) => punto.aves_muertas) : null}
              colorSerie="var(--cdc-tono-maiz)"
              cargando={cargandoMetricas}
              cargandoSerie={cargandoMetricas}
              accion="Abrir clientes y sus granjas"
              onAbrir={() => navigate('/organizaciones')}
            />
            <TarjetaKpiAdmin
              id="controladores"
              indice={4}
              etiqueta="Controladores en línea"
              icono="servidor"
              valor={conectividad?.conectados ?? null}
              total={conectividad?.total ?? null}
              detalle={
                errorConectividad ? 'Estado no disponible'
                  : !conectividad || conectividad.total === 0 ? 'Ninguno instalado'
                    : sinSenal === 0 ? `Todos reportan (últimos ${conectividad.ventana_minutos} min)`
                      : `${sinSenal} sin señal reciente`
              }
              delta={null}
              serie={null}
              colorSerie="var(--avisens-deep)"
              aviso={sinSenal > 0}
              cargando={cargandoConectividad && !conectividad}
              cargandoSerie={false}
              accion="Abrir dispositivos"
              onAbrir={() => navigate('/dispositivos')}
            />
          </div>
        </section>

        <PanelActividadPlataforma metricas={metricas} cargando={cargandoMetricas} error={errorMetricas} onReintentar={() => void recargarMetricas()} />

        <div className="cdc-fila">
          <PanelCrecimiento metricas={metricas} cargando={cargandoMetricas} error={errorMetricas} onReintentar={() => void recargarMetricas()} />
          <PanelMortalidad metricas={metricas} cargando={cargandoMetricas} error={errorMetricas} onReintentar={() => void recargarMetricas()} />
        </div>

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
