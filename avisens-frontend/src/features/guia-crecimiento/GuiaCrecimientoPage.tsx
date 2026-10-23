import { Link, useSearchParams } from 'react-router-dom'
import { getRol } from '@shared/api'
import { permisosDePlan } from '@shared/auth/permisos'
import { formatearFechaCalendario } from '@shared/utils/fechas'
import '@shared/ui/admin/AdminKit.css'
import FormularioPesoObjetivo from '../lotes/components/FormularioPesoObjetivo'
import { DESCRIPCION_DESACTUALIZADO_PLAN, etiquetaEstadoPlan } from '../lotes/model/planLoteVista'
import { formatearPeso } from './model/proyeccion'
import { useGuiaCrecimiento } from './hooks/useGuiaCrecimiento'
import { useProyeccionLote } from './hooks/useProyeccionLote'
import SeleccionarLoteGuia from './components/SeleccionarLoteGuia'
import PanelCrecimiento from './components/PanelCrecimiento'
import ProyeccionFaena from './components/ProyeccionFaena'
import './GuiaCrecimientoPage.css'

const MIN_PESO_OBJETIVO_G = 1000
const MAX_PESO_OBJETIVO_G = 4200

function GuiaCrecimientoPage() {
  const [parametros] = useSearchParams()
  const valorLote = parametros.get('lote')
  const loteId = valorLote && /^[1-9]\d*$/.test(valorLote) && Number.isSafeInteger(Number(valorLote))
    ? Number(valorLote) : null
  const guia = useGuiaCrecimiento(loteId)
  const permisos = permisosDePlan(getRol())
  const lote = guia.loteSeleccionado
  const rutaPadre = lote ? `/lotes?galpon=${lote.galpon.id}` : '/lotes'
  const revisionPlan = guia.plan ? `${guia.plan.id}-${guia.plan.version}-${guia.plan.desactualizado}` : 'sin-plan'
  const proyeccion = useProyeccionLote(loteId, lote?.estado === 'activo', revisionPlan)

  async function guardarPesoObjetivo(pesoObjetivoG: number) {
    if (guia.cargandoDetalle) throw new Error('Espera a que termine de cargar la curva del lote.')
    if (pesoObjetivoG < MIN_PESO_OBJETIVO_G) {
      throw new Error('El peso objetivo mínimo es de 1 kg (aproximadamente 2,20 lb).')
    }
    if (pesoObjetivoG > MAX_PESO_OBJETIVO_G) {
      throw new Error('El peso objetivo máximo es de 4,20 kg (aproximadamente 9,25 lb), correspondiente a un ciclo de hasta 50 días.')
    }
    await guia.crearPlan(pesoObjetivoG)
  }

  async function ejecutarAccion(accion: () => Promise<unknown>) {
    try { await accion() } catch {
      // El hook muestra el error de la operación en su sección correspondiente.
    }
  }

  if (loteId === null) {
    return <SeleccionarLoteGuia />
  }
  if (guia.cargandoLote) {
    return (
      <div className="page-container adm-page guia-page">
        <header className="guia-resumen-lote">
          <p className="adm-vacio" role="status">Cargando lote…</p>
        </header>
      </div>
    )
  }
  if (lote === null || lote.estado !== 'activo') {
    return (
      <div className="page-container adm-page guia-page">
        <header className="guia-resumen-lote">
          <div className="guia-cabecera-fila-superior">
            <div>
              <span className="guia-lote-badge">Guía de crecimiento</span>
              <h1 className="guia-lote-titulo">{lote ? lote.codigo : 'Lote no encontrado'}</h1>
              <p className="guia-lote-ubicacion">
                {lote ? `${lote.galpon.nombre} · ${lote.galpon.granja.nombre}` : 'El lote solicitado no está disponible.'}
              </p>
            </div>
            <div className="guia-cabecera-acciones">
              <Link className="adm-btn adm-btn--secundario" to={rutaPadre}>Volver a lotes</Link>
            </div>
          </div>
        </header>
        {guia.error ? (
          <div className="adm-alerta" role="alert"><span>{guia.error}</span><button type="button" onClick={guia.recargar}>Reintentar</button></div>
        ) : (
          <p className="adm-aviso">La guía de crecimiento está disponible para lotes activos.</p>
        )}
      </div>
    )
  }

  return (
    <div className="page-container adm-page guia-page">
      {guia.error && <div className="adm-alerta" role="alert"><span>{guia.error}</span><button type="button" onClick={guia.recargar} disabled={guia.guardando}>Reintentar</button></div>}

      <header className="guia-resumen-lote" role="region" aria-label="Información del lote">
        <div className="guia-cabecera-fila-superior">
          <div className="guia-resumen-principal">
            <div className="guia-cabecera-meta-top">
              <span className="guia-lote-badge">{lote.estado === 'activo' ? 'Lote activo' : lote.estado}</span>
              <nav className="adm-migas guia-migas" aria-label="Ruta de navegación">
                <Link className="adm-miga" to={rutaPadre}>Lotes</Link>
                <span className="adm-miga-sep" aria-hidden="true">›</span>
                <span className="adm-miga adm-miga--actual" aria-current="page">{lote.codigo}</span>
              </nav>
            </div>
            <h1 className="guia-lote-titulo">Guía de crecimiento · {lote.codigo}</h1>
            <p className="guia-lote-ubicacion">
              {lote.galpon.nombre} · {lote.galpon.granja.nombre}
              {lote.linea_genetica ? ` · Línea ${lote.linea_genetica.nombre}` : ''}
            </p>
          </div>

          <div className="guia-cabecera-acciones">
            <Link className="adm-btn adm-btn--primario" to={`/bitacora?lote=${lote.id}&vista=peso`}>
              + Registrar pesaje
            </Link>
            <Link className="adm-btn adm-btn--secundario" to={rutaPadre}>
              Volver a lotes
            </Link>
          </div>
        </div>

        <div className="guia-resumen-metricas">
          <div className="guia-resumen-item">
            <span className="guia-label">Edad del lote</span>
            <strong className="guia-valor-destacado">
              Día {guia.diaActual ?? '—'}
              {proyeccion.curva?.dia_final ? (
                <span className="guia-meta"> / {proyeccion.curva.dia_final} días</span>
              ) : null}
            </strong>
          </div>

          <div className="guia-resumen-item">
            <span className="guia-label">Población</span>
            <strong className="guia-valor-destacado">
              {lote.cantidad_inicial.toLocaleString('es-CO')}
              <span className="guia-meta"> aves</span>
            </strong>
          </div>

          <div className="guia-resumen-item">
            <span className="guia-label">Fecha de encasete</span>
            <strong>{formatearFechaCalendario(lote.fecha_ingreso)}</strong>
          </div>
        </div>
      </header>

      <section className="adm-panel guia-panel guia-meta-panel" aria-labelledby="guia-plan-titulo">
        <div className="guia-panel-titulo">
          <div>
            <span className="adm-eyebrow">Meta de crecimiento</span>
            <h2 id="guia-plan-titulo">¿A qué peso quieres llevar tus pollos?</h2>
            <p className="guia-meta-subtitulo">
              Fija el peso objetivo de venta para calcular automáticamente el día de salida y proyectar el ciclo.
            </p>
          </div>
          {guia.plan && permisos.registrar && (
            <button
              type="button"
              className="adm-btn adm-btn--secundario"
              onClick={() => void ejecutarAccion(() => guia.recalcularPlan())}
              disabled={guia.guardando || guia.cargandoPlan || guia.cargandoDetalle}
            >
              {guia.cargandoPlan ? 'Recalculando…' : 'Recalcular meta'}
            </button>
          )}
        </div>
        {guia.plan?.desactualizado && (
          <div className="adm-alerta" role="status">
            <strong>Meta desactualizada. </strong>
            <span>{DESCRIPCION_DESACTUALIZADO_PLAN} Los resultados corresponden a la meta guardada; se necesita recalcularla.</span>
          </div>
        )}
        <div className="guia-meta-contenido">
          {permisos.registrar && (guia.plan !== null || (!guia.cargandoPlan && !guia.errorPlan)) && (
            <div className="guia-meta-formulario">
              <FormularioPesoObjetivo
                key={`${lote.id}-${guia.plan?.id ?? 'nuevo'}`}
                pesoActualG={guia.plan?.peso_objetivo_g ?? null}
                minLibras={MIN_PESO_OBJETIVO_G / 453.59237}
                deshabilitado={guia.guardando || guia.cargandoPlan || guia.cargandoDetalle}
                onEnviar={guardarPesoObjetivo}
              />
            </div>
          )}
          {guia.errorPlan && (
            <div className="guia-error" role="alert">
              <span>{guia.errorPlan}</span>
              <button type="button" onClick={guia.recargar} disabled={guia.guardando}>Reintentar carga</button>
            </div>
          )}
          {guia.cargandoPlan ? (
            <p className="guia-cargando" role="status">Cargando objetivo del lote…</p>
          ) : guia.plan === null ? (
            <p className="guia-nota">Este lote todavía no tiene un objetivo de peso definido.</p>
          ) : (
            <div className="guia-datos-grid">
              <div><span>Peso objetivo</span><strong>{formatearPeso(guia.plan.peso_objetivo_g)}</strong></div>
              <div><span>Día estimado</span><strong>Día {guia.plan.resultado.dia_objetivo ?? '—'}</strong></div>
              <div><span>Fecha de salida</span><strong>{formatearFechaCalendario(guia.plan.resultado.fecha_salida_calculada)}</strong></div>
              <div><span>Estado</span><strong>{guia.plan.desactualizado ? 'Desactualizado' : etiquetaEstadoPlan(guia.plan.estado_dia)}</strong></div>
            </div>
          )}
        </div>
      </section>

      <PanelCrecimiento
        loteId={lote.id}
        curva={proyeccion.curva}
        problema={proyeccion.problemaCurva}
        cargando={proyeccion.cargandoCurva}
        onReintentar={proyeccion.recargar}
      />

      <ProyeccionFaena
        prediccion={proyeccion.prediccion}
        error={proyeccion.errorPrediccion}
        cargando={proyeccion.cargandoPrediccion}
      />
    </div>
  )
}

export default GuiaCrecimientoPage
