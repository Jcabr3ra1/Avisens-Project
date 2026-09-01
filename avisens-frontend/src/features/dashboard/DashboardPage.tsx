import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRol } from '@shared/api'
import DashboardHeader from './components/DashboardHeader'
import FranjaAtencion from './components/FranjaAtencion'
import EstadoLote from './components/EstadoLote'
import PanelMetricas from './components/PanelMetricas'
import PlanoGalpon from './components/PlanoGalpon'
import SelectorGalpones from './components/SelectorGalpones'
import EstadoGeneral from './components/EstadoGeneral'
import AccionesRapidas from './components/AccionesRapidas'
import ResumenOperativo from './components/ResumenOperativo'
import AlertasPrioritarias from './components/AlertasPrioritarias'
import EstadoInicial from './components/EstadoInicial'
import { useMonitoreoAmbiental } from '@features/monitoreo/hooks/useMonitoreoAmbiental'
import { useAtencion } from './hooks/useAtencion'
import { useIndicadoresLote } from './hooks/useIndicadoresLote'
import { useDashboard } from './hooks/useDashboard'
import './DashboardPage.css'

function DashboardSkeleton() {
  return (
    <div className="page-container dashboard-page" aria-busy="true" aria-label="Cargando resumen">
      <div className="dashboard-skeleton dashboard-skeleton--header" />
      <div className="dashboard-skeleton dashboard-skeleton--state" />
      <div className="dashboard-skeleton-grid">
        <div className="dashboard-skeleton dashboard-skeleton--panel" />
        <div className="dashboard-skeleton dashboard-skeleton--panel" />
      </div>
    </div>
  )
}

function DashboardPage() {
  const navigate = useNavigate()
  const dashboard = useDashboard()
  const { galpones: galponesMonitoreo } = useMonitoreoAmbiental()
  const galponMonitoreo =
    galponesMonitoreo.find((item) => item.id === dashboard.galponId) ?? null
  const sensoresDelGalpon = galponMonitoreo?.sensores ?? []
  const { indicadores, comparacion, cargando: cargandoLote } = useIndicadoresLote(
    dashboard.lote?.id ?? null,
  )
  const chipsAtencion = useAtencion({
    alertas: dashboard.alertas,
    galponId: dashboard.galponId,
    indicadores,
    comparacion,
  })
  const rol = getRol()
  const puedeAdministrar = ['Administrador', 'Propietario'].includes(rol ?? '')
  const nombre = dashboard.usuario?.nombre?.trim().split(/\s+/)[0] || 'equipo'
  const [busqueda, setBusqueda] = useState('')

  if (dashboard.cargando && dashboard.granjas.length === 0) {
    return <DashboardSkeleton />
  }

  if (dashboard.error && dashboard.granjas.length === 0) {
    return (
      <div className="page-container dashboard-page">
        <section className="dashboard-error" role="alert">
          <h1>No pudimos mostrar tu resumen</h1>
          <p>{dashboard.error}</p>
          <button className="dashboard-primary-button" type="button" onClick={dashboard.recargar}>
            Intentar de nuevo
          </button>
        </section>
      </div>
    )
  }

  if (dashboard.granjas.length === 0 || dashboard.totalGalpones === 0) {
    return (
      <div className="page-container dashboard-page">
        <EstadoInicial
          granjas={dashboard.granjas.length}
          galpones={dashboard.totalGalpones}
          rol={rol}
          onIrAProduccion={() => navigate('/granjas')}
          onRecargar={dashboard.recargar}
        />
      </div>
    )
  }

  const rutaEstado = dashboard.estadoGeneral.estado === 'sin_lote'
    ? '/granjas'
    : dashboard.estadoGeneral.estado === 'correcto'
      ? '/monitoreo'
      : '/alertas'

  return (
    <div className="page-container dashboard-page">
      <DashboardHeader
        nombre={nombre}
        granjas={dashboard.granjas}
        granjaId={dashboard.granjaId}
        actualizadoEn={dashboard.actualizadoEn}
        cargando={dashboard.cargando}
        busqueda={busqueda}
        onGranjaChange={dashboard.seleccionarGranja}
        onBusquedaChange={setBusqueda}
        onRecargar={dashboard.recargar}
        onIrABitacora={() => navigate('/bitacora')}
        onIrAAlertas={() => navigate('/alertas')}
        onIrANotificaciones={() => navigate('/notificaciones')}
      />

      <FranjaAtencion chips={chipsAtencion} />

      {dashboard.error && (
        <div className="dashboard-error-banner" role="alert">
          <span>{dashboard.error}</span>
          <button type="button" onClick={dashboard.recargar}>Reintentar</button>
        </div>
      )}

      <SelectorGalpones
        galpones={dashboard.galpones}
        lotes={dashboard.lotes}
        alertasPorGalpon={dashboard.alertasPorGalpon}
        galponId={dashboard.galponId}
        busqueda={busqueda}
        onSeleccionar={dashboard.seleccionarGalpon}
        onAgregar={puedeAdministrar ? () => navigate('/galpones') : undefined}
      />

      <EstadoGeneral
        estado={dashboard.estadoGeneral}
        onAccion={dashboard.estadoGeneral.estado === 'sin_lote' && !puedeAdministrar
          ? undefined
          : () => navigate(rutaEstado)}
      />

      <PanelMetricas sensores={sensoresDelGalpon} />

      <ResumenOperativo
        galpon={dashboard.galpon}
        lote={dashboard.lote}
        diaLote={dashboard.diaLote}
        alertasAbiertas={dashboard.alertas.length}
      />

      <div className="dashboard-content-grid">
        <AccionesRapidas puedeAdministrar={puedeAdministrar} onNavigate={navigate} />
        <AlertasPrioritarias alertas={dashboard.alertas} onVerTodas={() => navigate('/alertas')} />
      </div>

      <div className="dash-lote-plano">
        <EstadoLote
        lote={dashboard.lote}
        indicadores={indicadores}
        comparacion={comparacion}
        diaLote={dashboard.diaLote}
        cargando={cargandoLote}
        onAbrirBitacora={() => navigate('/bitacora')}
        />
        <PlanoGalpon galpon={galponMonitoreo} />
      </div>
    </div>
  )
}

export default DashboardPage
