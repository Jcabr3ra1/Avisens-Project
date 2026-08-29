import { useNavigate } from 'react-router-dom'
import DashboardHeader from './components/DashboardHeader'
import EstadoGeneral from './components/EstadoGeneral'
import AccionesRapidas from './components/AccionesRapidas'
import ResumenOperativo from './components/ResumenOperativo'
import AlertasPrioritarias from './components/AlertasPrioritarias'
import ResumenProductivo from './components/ResumenProductivo'
import EstadoInicial from './components/EstadoInicial'
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
  const puedeAdministrar = dashboard.usuario?.rol === 'Propietario'
  const nombre = dashboard.usuario?.nombre?.trim().split(/\s+/)[0] || 'equipo'

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
          puedeAdministrar={puedeAdministrar}
          onComenzar={() => navigate('/granjas')}
          onRecargar={dashboard.recargar}
        />
      </div>
    )
  }

  const rutaEstado = dashboard.estadoGeneral.estado === 'sin_lote'
    ? '/lotes'
    : dashboard.estadoGeneral.estado === 'correcto'
      ? '/monitoreo'
      : '/alertas'

  return (
    <div className="page-container dashboard-page">
      <DashboardHeader
        nombre={nombre}
        granjas={dashboard.granjas}
        galpones={dashboard.galpones}
        granjaId={dashboard.granjaId}
        galponId={dashboard.galponId}
        actualizadoEn={dashboard.actualizadoEn}
        cargando={dashboard.cargando}
        onGranjaChange={dashboard.seleccionarGranja}
        onGalponChange={dashboard.seleccionarGalpon}
        onRecargar={dashboard.recargar}
      />

      {dashboard.error && (
        <div className="dashboard-error-banner" role="alert">
          <span>{dashboard.error}</span>
          <button type="button" onClick={dashboard.recargar}>Reintentar</button>
        </div>
      )}

      <EstadoGeneral
        estado={dashboard.estadoGeneral}
        onAccion={dashboard.estadoGeneral.estado === 'sin_lote' && !puedeAdministrar
          ? undefined
          : () => navigate(rutaEstado)}
      />

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

      <ResumenProductivo
        indicador={dashboard.indicador}
        cargando={dashboard.cargandoIndicador}
        tieneLote={dashboard.lote !== null}
        onAbrirBitacora={() => navigate('/bitacora')}
      />
    </div>
  )
}

export default DashboardPage
