import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRol } from '@shared/api'
import HeroGranja from './components/HeroGranja'
import EscenarioGalpon from './components/EscenarioGalpon'
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
import { estadoGranja } from './model/estadoGranja'
import '@shared/ui/admin/AdminKit.css'
import '@shared/ui/admin/CentroControl.css'
import './DashboardPage.css'
import './ResumenGranja.css'
import './ResumenRediseno.css'

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
  }), [dashboard.alertasGranja, dashboard.galpones, monitoreoGranja])
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

  const estado = estadoGranja({ atencion, filas })

  function ejecutarAccion() {
    if (!estado.accion) return
    if (estado.accion.tipo === 'atencion') {
      abrirPendiente(estado.accion.item)
      return
    }
    navigate(dashboard.lote ? `/guia-crecimiento?lote=${dashboard.lote.id}` : '/guia-crecimiento')
  }

  function abrirPendiente(item: ItemAtencionGranja) {
    enGranjas(item.tipo === 'alerta' ? 'alertas' : 'ambiente', item.galponId)
  }

  return (
    <div className="page-container dashboard-page resumen-page">
      <HeroGranja
        nombre={nombre}
        fecha={fecha}
        granjas={dashboard.granjas}
        granjaId={dashboard.granjaId}
        estado={estado}
        kpis={kpis}
        cargando={dashboard.cargando || cargandoMonitoreo}
        onGranjaChange={dashboard.seleccionarGranja}
        onRecargar={() => void dashboard.recargar()}
        onAccion={ejecutarAccion}
        onNavegar={(destino) => (destino.startsWith('/granjas') ? enGranjas(new URLSearchParams(destino.split('?')[1] ?? '').get('pestana') ?? 'resumen') : navigate(destino))}
      />

      {dashboard.error && (
        <div className="adm-alerta" role="alert">
          <span>{dashboard.error}</span>
          <button type="button" onClick={() => void dashboard.recargar()}>Reintentar</button>
        </div>
      )}

      {(atencion.length > 0 || (dashboard.cargando && atencion.length === 0)) && (
        <PanelAtencionGranja
          items={atencion}
          cargando={dashboard.cargando && atencion.length === 0}
          onAbrir={abrirPendiente}
          onIrAlertas={() => enGranjas('alertas')}
          onIrMonitoreo={() => enGranjas('ambiente')}
          onIrBitacora={() => enGranjas('bitacora')}
        />
      )}

      <PanelGalpones
        filas={filas}
        galponId={dashboard.galponId}
        onSeleccionar={dashboard.seleccionarGalpon}
        onGestionar={() => navigate(dashboard.granjaId ? `/galpones?granja=${dashboard.granjaId}` : '/granjas')}
      />

      <EscenarioGalpon
        titulo={dashboard.galpon ? dashboard.galpon.nombre : 'Tu galpón'}
        detalle="Mira lo que pasa adentro, una vista a la vez"
        resumenAmbiente={sensoresDelGalpon.length > 0 ? `${reportando} de ${sensoresDelGalpon.length} sensores reportando` : null}
        ambiente={<PanelMetricas sensores={sensoresDelGalpon} />}
        lote={(
          <EstadoLote
            lote={dashboard.lote}
            indicadores={indicadores}
            comparacion={comparacion}
            diaLote={dashboard.diaLote}
            cargando={cargandoLote}
            onAbrirBitacora={() => enGranjas('bitacora')}
            onAbrirGuia={() => dashboard.lote && navigate(`/guia-crecimiento?lote=${dashboard.lote.id}`)}
          />
        )}
        plano={<PlanoGalpon galpon={galponMonitoreo} />}
      />
    </div>
  )
}

export default DashboardPage
