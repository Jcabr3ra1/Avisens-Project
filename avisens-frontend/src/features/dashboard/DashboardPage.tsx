import { useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRol } from '@shared/api'
import { IcArrowRight, IcBox, IcCoin, IcDoc, IcThermo } from '@shared/ui/icons/icons'
import { useMonitoreoAmbiental } from '@features/monitoreo/hooks/useMonitoreoAmbiental'
import { useRefetchOnFocus } from '@shared/hooks/useRefetchOnFocus'
import CalorProximo from './components/CalorProximo'
import ComoVaElLote, { type AccionLote } from './components/ComoVaElLote'
import EstadoInicial from './components/EstadoInicial'
import GraficaPeso from './components/GraficaPeso'
import ResumenSkeleton from './components/ResumenSkeleton'
import SaludoGranja from './components/SaludoGranja'
import SemaforoGranja from './components/SemaforoGranja'
import TarjetasGalpones from './components/TarjetasGalpones'
import { useAhora } from './hooks/useAhora'
import { useClimaHoy } from './hooks/useClimaHoy'
import { useDashboard } from './hooks/useDashboard'
import { useIndicadoresLote } from './hooks/useIndicadoresLote'
import { cifrasCabecera, type CifraCabecera } from './model/cabecera'
import { faseDelDia } from './model/escenaGalpon'
import { serieDePesoVerificado } from './model/estadoLote'
import { filasGalpones, itemsAtencionGranja, type ItemAtencionGranja } from './model/resumenGranja'
import { contarSensores, destinoPendiente, semaforoGeneral, type EstadoSensores } from './model/semaforo'
import { tarjetasGalpones } from './model/tarjetasGalpon'
import { saludoDelDia } from './model/tiempo'
import '@shared/ui/admin/AdminKit.css'
import './DashboardPage.css'
import './ResumenAbajo.css'
import './ResumenPropietario.css'

function DashboardPage() {
  const navigate = useNavigate()
  const dashboard = useDashboard()
  useRefetchOnFocus(dashboard.recargar)
  const ahora = useAhora()
  const climaHoy = useClimaHoy(dashboard.granjaId)
  const { galpones: monitoreo, cargando: cargandoMonitoreo, error: errorMonitoreo } = useMonitoreoAmbiental()
  const monitoreoGranja = useMemo(
    () => monitoreo.filter((galpon) => galpon.granjaId === dashboard.granjaId),
    [monitoreo, dashboard.granjaId],
  )
  const { indicadores, comparacion, cargando: cargandoLote, recargar: recargarIndicadores } = useIndicadoresLote(dashboard.lote?.id ?? null)
  useRefetchOnFocus(recargarIndicadores)
  const loteRef = useRef<HTMLDivElement>(null)
  const rol = getRol()
  const nombre = dashboard.usuario?.nombre?.trim().split(/\s+/)[0] ?? ''
  const fecha = new Date(ahora).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
  const hora = new Date(ahora).getHours()

  const atencion = useMemo(() => itemsAtencionGranja({
    alertas: dashboard.alertasGranja,
    galpones: dashboard.galpones,
    monitoreo: monitoreoGranja,
    riesgosCrecimiento: dashboard.resumenCrecimiento?.riesgos ?? [],
    ahora,
  }), [dashboard.alertasGranja, dashboard.galpones, dashboard.resumenCrecimiento, monitoreoGranja, ahora])
  const filas = useMemo(() => filasGalpones({
    galpones: dashboard.galpones,
    lotes: dashboard.lotes,
    alertas: dashboard.alertasGranja,
    monitoreo: monitoreoGranja,
  }), [dashboard.galpones, dashboard.lotes, dashboard.alertasGranja, monitoreoGranja])
  const tarjetas = useMemo(() => tarjetasGalpones({
    filas,
    monitoreo: monitoreoGranja,
    lotes: dashboard.lotes,
    ahora,
  }), [filas, monitoreoGranja, dashboard.lotes, ahora])

  const sensores: EstadoSensores = useMemo(() => {
    if (monitoreo.length === 0 && cargandoMonitoreo) return { estado: 'cargando' }
    if (monitoreo.length === 0 && errorMonitoreo) return { estado: 'error' }
    return { estado: 'listo', ...contarSensores(monitoreoGranja, ahora) }
  }, [monitoreo.length, cargandoMonitoreo, errorMonitoreo, monitoreoGranja, ahora])

  const semaforo = useMemo(() => semaforoGeneral({
    atencion,
    filas,
    sensores,
    revisando: dashboard.cargandoResumenCrecimiento && atencion.length === 0,
  }), [atencion, filas, sensores, dashboard.cargandoResumenCrecimiento])
  const cifras = useMemo(() => cifrasCabecera(filas, sensores), [filas, sensores])
  const seriePeso = useMemo(() => serieDePesoVerificado([...indicadores].reverse()), [indicadores])

  if (dashboard.cargando && dashboard.granjas.length === 0) {
    return <ResumenSkeleton />
  }

  if (dashboard.error && dashboard.granjas.length === 0) {
    return (
      <div className="page-container dashboard-page rp-page">
        <section className="dashboard-error" role="alert">
          <h1>No fue posible cargar el resumen</h1>
          <p>{dashboard.error}</p>
          <button className="rp-boton rp-boton--primario" type="button" onClick={dashboard.recargar}>
            Reintentar
          </button>
        </section>
      </div>
    )
  }

  if (dashboard.granjas.length === 0 || dashboard.totalGalpones === 0) {
    return (
      <div className="page-container dashboard-page rp-page">
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

  const nombreGalpon = dashboard.galpon?.nombre ?? 'Galpón'

  const destinoSemaforo = semaforo.principal ? destinoPendiente(semaforo.principal, dashboard.granjaId) : null
  const loteActual = dashboard.lote
  const accionLote: AccionLote | null = (() => {
    if (!loteActual) return null
    const destino = seriePeso.length > 0
      ? `/guia-crecimiento?lote=${loteActual.id}`
      : `/granjas/galpones/${loteActual.galponId}?pestana=bitacora&vista=peso`
    if (destino === destinoSemaforo) return null
    return {
      texto: seriePeso.length > 0 ? 'Ver guía de crecimiento' : 'Registrar pesaje',
      onClick: () => navigate(destino),
    }
  })()

  function abrirPendiente(item: ItemAtencionGranja) {
    navigate(destinoPendiente(item, dashboard.granjaId))
  }

  function elegirGalpon(id: number) {
    dashboard.seleccionarGalpon(id)
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.requestAnimationFrame(() => {
      loteRef.current?.scrollIntoView({ behavior: quieto ? 'auto' : 'smooth', block: 'nearest' })
    })
  }

  function abrirCifra(id: CifraCabecera['id']) {
    if (id === 'galpones') {
      navigate(dashboard.granjaId ? `/granjas?granjaId=${dashboard.granjaId}` : '/granjas')
    } else if (id === 'aves') {
      if (dashboard.galponId !== null) navigate(`/granjas/galpones/${dashboard.galponId}?pestana=lotes`)
      else navigate('/granjas')
    } else if (id === 'alertas') {
      if (dashboard.galponId !== null) navigate(`/granjas/galpones/${dashboard.galponId}?pestana=alertas`)
      else navigate('/alertas')
    } else {
      if (dashboard.galponId !== null) navigate(`/granjas/galpones/${dashboard.galponId}?pestana=ambiente`)
      else navigate('/monitoreo')
    }
  }

  function abrirGalpon(id: number) {
    navigate(`/granjas/galpones/${id}`)
  }

  const rutaBitacora = dashboard.galponId !== null
    ? `/granjas/galpones/${dashboard.galponId}?pestana=bitacora`
    : '/granjas'

  return (
    <div className="page-container dashboard-page rp-page">
      <SaludoGranja
        saludo={saludoDelDia(hora)}
        nombre={nombre}
        fecha={fecha}
        clima={climaHoy}
        fase={faseDelDia(hora)}
        cifras={cifras}
        granjas={dashboard.granjas}
        granjaId={dashboard.granjaId}
        onGranjaChange={dashboard.seleccionarGranja}
        onIrAGranja={() => navigate(dashboard.granjaId ? `/granjas?granjaId=${dashboard.granjaId}` : '/granjas')}
        onClickCifra={abrirCifra}
      />

      {dashboard.error && (
        <p className="rp-aviso" role="alert">
          No fue posible actualizar el resumen; se muestran los últimos datos.
          <button type="button" className="rp-boton rp-boton--secundario" onClick={() => void dashboard.recargar()}>
            Reintentar
          </button>
        </p>
      )}

      <div className={dashboard.galponId !== null ? 'rp-tablero' : 'rp-tablero rp-tablero--una'}>
        <div className="rp-col">
          <SemaforoGranja
            semaforo={semaforo}
            errorCrecimiento={dashboard.errorCrecimiento}
            onAbrir={abrirPendiente}
            onReintentarCrecimiento={dashboard.recargarCrecimiento}
          />
          <TarjetasGalpones
            tarjetas={tarjetas}
            galponId={dashboard.galponId}
            onSeleccionar={elegirGalpon}
            onAbrirGalpon={abrirGalpon}
          />

          <section className="rp-tarjeta rp-accesos" aria-labelledby="rp-accesos-titulo">
            <div className="rp-cab">
              <h2 id="rp-accesos-titulo" className="rp-titulo">Accesos rápidos</h2>
              <span className="rp-cab-meta">Gestión diaria</span>
            </div>
            <div className="rp-accesos-grid">
              <button type="button" className="rp-acceso" onClick={() => navigate(rutaBitacora)}>
                <span className="rp-acceso-icono rp-acceso-icono--primario" aria-hidden="true"><IcDoc size={16} /></span>
                <span className="rp-acceso-texto">
                  <strong>Bitácora del día</strong>
                  <small>Pesajes, mortalidad y consumos</small>
                </span>
                <IcArrowRight size={14} className="rp-acceso-flecha" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="rp-acceso"
                onClick={() => navigate(dashboard.galponId !== null ? `/granjas/galpones/${dashboard.galponId}?pestana=ambiente` : '/monitoreo')}
              >
                <span className="rp-acceso-icono rp-acceso-icono--info" aria-hidden="true"><IcThermo size={16} /></span>
                <span className="rp-acceso-texto">
                  <strong>Monitoreo</strong>
                  <small>Sensores y control ambiental</small>
                </span>
                <IcArrowRight size={14} className="rp-acceso-flecha" aria-hidden="true" />
              </button>
              <button type="button" className="rp-acceso" onClick={() => navigate('/inventario')}>
                <span className="rp-acceso-icono rp-acceso-icono--ok" aria-hidden="true"><IcBox size={16} /></span>
                <span className="rp-acceso-texto">
                  <strong>Bodega e insumos</strong>
                  <small>Stock de alimento y medicinas</small>
                </span>
                <IcArrowRight size={14} className="rp-acceso-flecha" aria-hidden="true" />
              </button>
              <button type="button" className="rp-acceso" onClick={() => navigate('/finanzas')}>
                <span className="rp-acceso-icono rp-acceso-icono--alerta" aria-hidden="true"><IcCoin size={16} /></span>
                <span className="rp-acceso-texto">
                  <strong>Finanzas</strong>
                  <small>Costos, ingresos y margen</small>
                </span>
                <IcArrowRight size={14} className="rp-acceso-flecha" aria-hidden="true" />
              </button>
            </div>
          </section>
        </div>

        {dashboard.galponId !== null && (
          <div ref={loteRef} className="rp-col rp-lote-ancla">
            <ComoVaElLote
              nombreGalpon={nombreGalpon}
              lote={dashboard.lote}
              indicadores={indicadores}
              comparacion={comparacion}
              seriePeso={seriePeso}
              diaLote={dashboard.diaLote}
              cargando={cargandoLote}
              accion={accionLote}
              onAbrirBitacora={() => navigate(rutaBitacora)}
            />
          </div>
        )}
      </div>

      {dashboard.galponId !== null && (
        <div className="rp-fila-doble">
          {dashboard.lote && <GraficaPeso serie={seriePeso} />}
          <CalorProximo galponId={dashboard.galponId} />
        </div>
      )}
    </div>
  )
}

export default DashboardPage
