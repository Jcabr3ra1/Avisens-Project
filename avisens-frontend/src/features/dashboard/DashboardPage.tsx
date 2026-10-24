import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRol } from '@shared/api'
import CabeceraGranja from './components/CabeceraGranja'
import PanelAtencionGranja from './components/PanelAtencionGranja'
import PanelGalpones from './components/PanelGalpones'
import EstadoLote from './components/EstadoLote'
import PanelMetricas from './components/PanelMetricas'
import PlanoGalpon from './components/PlanoGalpon'
import EstadoInicial from './components/EstadoInicial'
import { tieneLecturaUtil, useMonitoreoAmbiental } from '@features/monitoreo/hooks/useMonitoreoAmbiental'
import { useIndicadoresLote } from './hooks/useIndicadoresLote'
import { useDashboard } from './hooks/useDashboard'
import { filasGalpones, itemsAtencionGranja, kpisGranja, type ItemAtencionGranja } from './model/resumenGranja'
import '@shared/ui/admin/AdminKit.css'
import '@shared/ui/admin/CentroControl.css'
import './DashboardPage.css'
import './ResumenGranja.css'

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
  const { galpones: monitoreo, cargando: cargandoMonitoreo } = useMonitoreoAmbiental()
  const monitoreoGranja = useMemo(
    () => monitoreo.filter((galpon) => galpon.granjaId === dashboard.granjaId),
    [monitoreo, dashboard.granjaId],
  )
  const galponMonitoreo = monitoreoGranja.find((item) => item.id === dashboard.galponId) ?? null
  const sensoresDelGalpon = (galponMonitoreo?.sensores ?? []).filter((s) => !s.esEstado)
  const { indicadores, comparacion, cargando: cargandoLote } = useIndicadoresLote(dashboard.lote?.id ?? null)
  const rol = getRol()
  const nombre = dashboard.usuario?.nombre?.trim().split(/\s+/)[0] || 'equipo'
  const fecha = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })

  const kpis = useMemo(() => kpisGranja({
    galpones: dashboard.galpones,
    lotes: dashboard.lotes,
    alertas: dashboard.alertasGranja,
    sensores: monitoreoGranja.flatMap((galpon) => galpon.sensores),
  }), [dashboard.galpones, dashboard.lotes, dashboard.alertasGranja, monitoreoGranja])
  const atencion = useMemo(() => itemsAtencionGranja({
    alertas: dashboard.alertasGranja,
    galpones: dashboard.galpones,
    monitoreo: monitoreoGranja,
    riesgosCrecimiento: dashboard.resumenCrecimiento?.riesgos ?? [],
  }), [dashboard.alertasGranja, dashboard.galpones, dashboard.resumenCrecimiento, monitoreoGranja])
  const filas = useMemo(() => filasGalpones({
    galpones: dashboard.galpones,
    lotes: dashboard.lotes,
    alertas: dashboard.alertasGranja,
    monitoreo: monitoreoGranja,
  }), [dashboard.galpones, dashboard.lotes, dashboard.alertasGranja, monitoreoGranja])

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

  const reportando = sensoresDelGalpon.filter((sensor) => tieneLecturaUtil(sensor.estado)).length

  const enGranjas = (pestana: string, galponId = dashboard.galponId) =>
    navigate(`/granjas?granjaId=${dashboard.granjaId ?? ''}${galponId ? `&galpon=${galponId}` : ''}&pestana=${pestana}`)

  function abrirPendiente(item: ItemAtencionGranja) {
    if (item.tipo === 'crecimiento' && item.loteId !== undefined) {
      navigate(`/guia-crecimiento?lote=${item.loteId}`)
      return
    }
    enGranjas(item.tipo === 'alerta' ? 'alertas' : 'ambiente', item.galponId)
  }

  return (
    <div className="page-container dashboard-page resumen-page">
      <CabeceraGranja
        nombre={nombre}
        fecha={fecha}
        granjas={dashboard.granjas}
        granjaId={dashboard.granjaId}
        kpis={kpis}
        cargando={dashboard.cargando || cargandoMonitoreo}
        onGranjaChange={dashboard.seleccionarGranja}
        onRecargar={() => void dashboard.recargar()}
        onNavegar={(destino) => (destino.startsWith('/granjas') ? enGranjas(new URLSearchParams(destino.split('?')[1] ?? '').get('pestana') ?? 'resumen') : navigate(destino))}
      />

      {dashboard.error && (
        <div className="adm-alerta" role="alert">
          <span>{dashboard.error}</span>
          <button type="button" onClick={() => void dashboard.recargar()}>Reintentar</button>
        </div>
      )}

      <div className="admin-primary-grid">
        <PanelAtencionGranja
          items={atencion}
          cargando={(dashboard.cargando || dashboard.cargandoResumenCrecimiento) && atencion.length === 0}
          errorCrecimiento={dashboard.errorCrecimiento}
          onAbrir={abrirPendiente}
          onIrAlertas={() => enGranjas('alertas')}
          onIrMonitoreo={() => enGranjas('ambiente')}
          onIrBitacora={() => enGranjas('bitacora')}
        />
        <PanelGalpones
          filas={filas}
          galponId={dashboard.galponId}
          onSeleccionar={dashboard.seleccionarGalpon}
          onGestionar={() => navigate(dashboard.granjaId ? `/galpones?granja=${dashboard.granjaId}` : '/granjas')}
        />
      </div>

      <section className="admin-card resumen-ambiente" aria-labelledby="resumen-ambiente-titulo">
        <div className="admin-card-head">
          <div>
            <h2 id="resumen-ambiente-titulo" className="admin-card-title">
              Ambiente{dashboard.galpon ? ` · ${dashboard.galpon.nombre}` : ''}
            </h2>
            <p className="admin-card-sub">Lecturas de los sensores del galpón en las últimas 24 horas</p>
          </div>
          {sensoresDelGalpon.length > 0 && (
            <span className={`resumen-reportando${reportando < sensoresDelGalpon.length ? ' is-alerta' : ''}`}>
              {reportando} de {sensoresDelGalpon.length} reportando
            </span>
          )}
        </div>
        <PanelMetricas sensores={sensoresDelGalpon} />
      </section>

      <div className="admin-secondary-grid resumen-lote-plano">
        <EstadoLote
          lote={dashboard.lote}
          indicadores={indicadores}
          comparacion={comparacion}
          diaLote={dashboard.diaLote}
          cargando={cargandoLote}
          onAbrirBitacora={() => enGranjas('bitacora')}
          onAbrirGuia={() => dashboard.lote && navigate(`/guia-crecimiento?lote=${dashboard.lote.id}`)}
        />
        <PlanoGalpon galpon={galponMonitoreo} />
      </div>
    </div>
  )
}

export default DashboardPage
