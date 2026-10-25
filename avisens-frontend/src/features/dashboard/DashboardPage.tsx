import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRol } from '@shared/api'
import HeroGranja from './components/HeroGranja'
import ResumenGalpon from './components/ResumenGalpon'
import RiesgoCalorResumen from './components/RiesgoCalorResumen'
import PanelAtencionGranja from './components/PanelAtencionGranja'
import PanelGalpones from './components/PanelGalpones'
import EstadoLote from './components/EstadoLote'
import EstadoInicial from './components/EstadoInicial'
import { tieneLecturaUtil, useMonitoreoAmbiental } from '@features/monitoreo/hooks/useMonitoreoAmbiental'
import { useIndicadoresLote } from './hooks/useIndicadoresLote'
import { useDashboard } from './hooks/useDashboard'
import { filasGalpones, itemsAtencionGranja, kpisGranja, lotesActivosDe, type ItemAtencionGranja } from './model/resumenGranja'
import { estadoGranja } from './model/estadoGranja'
import { sensoresDeEscena } from './model/escenaGalpon'
import '@shared/ui/admin/AdminKit.css'
import '@shared/ui/admin/CentroControl.css'
import './DashboardPage.css'
import './ResumenGranja.css'
import './ResumenRediseno.css'
import './ResumenAbajo.css'

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
  const sensoresEscena = sensoresDeEscena(sensoresDelGalpon.map((sensor) => ({
    id: sensor.id,
    codigo: sensor.codigo,
    tipo: sensor.tipo,
    valor: sensor.valor,
    unidad: sensor.unidad,
    estado: sensor.estado,
    ultimaLecturaTs: sensor.ultimaLecturaTs,
    minUmbral: sensor.minUmbral,
    maxUmbral: sensor.maxUmbral,
  })))
  const lotesActivos = lotesActivosDe(dashboard.galpones, dashboard.lotes)
  const avesAlojadas = lotesActivos.reduce((total, lote) => total + lote.cantidadInicial, 0)
  const diaUnico = lotesActivos.length === 1 ? dashboard.diaLote : null

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
    if (item.tipo === 'crecimiento' && item.loteId !== undefined) {
      navigate(`/guia-crecimiento?lote=${item.loteId}`)
      return
    }
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
        diaLote={diaUnico}
        aves={avesAlojadas}
        nombreGalpon={dashboard.galpon?.nombre ?? null}
        sensores={sensoresEscena}
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
          cargando={(dashboard.cargando || dashboard.cargandoResumenCrecimiento) && atencion.length === 0}
          errorCrecimiento={dashboard.errorCrecimiento}
          onReintentarCrecimiento={dashboard.recargarCrecimiento}
        />
      )}

      {dashboard.galpones.length > 1 && (
        <PanelGalpones
          filas={filas}
          galponId={dashboard.galponId}
          onSeleccionar={dashboard.seleccionarGalpon}
        />
      )}

      <ResumenGalpon
        titulo={dashboard.galpon ? dashboard.galpon.nombre : 'Tu galpón'}
        detalle="Así está por dentro, ahora mismo"
        etiqueta={sensoresDelGalpon.length > 0 ? `${reportando} de ${sensoresDelGalpon.length} sensores reportando` : null}
        sensores={sensoresEscena}
        aves={avesAlojadas}
        diaLote={diaUnico}
        lote={(
          <>
            {dashboard.galponId !== null && <RiesgoCalorResumen galponId={dashboard.galponId} />}
            <EstadoLote
              lote={dashboard.lote}
              indicadores={indicadores}
              comparacion={comparacion}
              diaLote={dashboard.diaLote}
              cargando={cargandoLote}
            />
          </>
        )}
      />
    </div>
  )
}

export default DashboardPage
