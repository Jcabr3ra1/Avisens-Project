import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getRol } from '@shared/api'
import { permisosDePlan, ROL_ADMIN, ROL_PROPIETARIO, ROL_OPERARIO } from '@shared/auth/permisos'
import { useRefetchOnFocus } from '@shared/hooks/useRefetchOnFocus'
import { IcArrowRight, IcChart, IcDoc, IcSeed } from '@shared/ui/icons/icons'
import { formatearFechaCalendario } from '@shared/utils/fechas'
import '@shared/ui/admin/AdminKit.css'
import { useGuiaCrecimiento } from './hooks/useGuiaCrecimiento'
import { useProyeccionLote } from './hooks/useProyeccionLote'
import { useAnomaliasLote } from './hooks/useAnomaliasLote'
import SeleccionarLoteGuia from './components/SeleccionarLoteGuia'
import PanelCrecimiento from './components/PanelCrecimiento'
import AlertasTempranas from './components/AlertasTempranas'
import LecturaDelDia from './components/LecturaDelDia'
import MetaDelLote from './components/MetaDelLote'
import ReglaCiclo from './components/ReglaCiclo'
import ProyeccionFaena from './components/ProyeccionFaena'
import ReportesCrecimiento from './components/ReportesCrecimiento'
import ResumenAlimentacionLote from './components/ResumenAlimentacionLote'
import ModalCompararLotes from './components/ModalCompararLotes'
import { fraseDeCrecimiento, severidadPorDia } from './model/reglaCiclo'
import { formatearPeso } from './model/proyeccion'
import { obtenerEtapaDelDia, obtenerFasesCiclo } from './model/etapasAlimentacion'
import './GuiaCrecimientoPage.css'
import './GuiaCiclo.css'

const MIN_PESO_OBJETIVO_G = 1000
const MAX_PESO_OBJETIVO_G = 4200

type SeccionGuia = 'curva' | 'plan' | 'reportes'

function seccionDe(valor: string | null): SeccionGuia {
  if (valor === 'plan' || valor === 'reportes') return valor
  return 'curva'
}

const unDecimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })

function GuiaCrecimientoPage() {
  const [parametros, setParametros] = useSearchParams()
  const valorLote = parametros.get('lote')
  const loteId = valorLote && /^[1-9]\d*$/.test(valorLote) && Number.isSafeInteger(Number(valorLote))
    ? Number(valorLote) : null
  const seccion = seccionDe(parametros.get('seccion'))
  const guia = useGuiaCrecimiento(loteId)
  useRefetchOnFocus(guia.recargar)
  const rol = getRol()
  const permisos = permisosDePlan(rol)
  const puedeComparar = rol === ROL_ADMIN || rol === ROL_PROPIETARIO
  const esPropietario = rol === ROL_PROPIETARIO
  const esOperario = rol === ROL_OPERARIO
  const lote = guia.loteSeleccionado
  const rutaPadre = esPropietario
    ? (lote ? `/granjas/galpones/${lote.galpon.id}` : '/granjas')
    : (lote ? `/lotes?galpon=${lote.galpon.id}` : '/lotes')
  const textoVolver = esPropietario ? 'Volver al galpón' : 'Volver a lotes'
  const revisionPlan = guia.plan ? `${guia.plan.id}-${guia.plan.version}-${guia.plan.desactualizado}` : 'sin-plan'
  const proyeccion = useProyeccionLote(loteId, lote?.estado === 'activo', revisionPlan)
  const anomalias = useAnomaliasLote(loteId, lote?.estado === 'activo')
  const curva = proyeccion.curva
  const diaHoy = curva?.dia_actual ?? guia.diaActual ?? 1
  const primerDia = curva?.serie[0]?.dia ?? 1
  const diaFinal = Math.max(primerDia + 1, curva?.dia_final ?? guia.plan?.resultado.dia_objetivo ?? 42)
  const [diaElegido, setDiaElegido] = useState<number | null>(null)
  const [abriendoComparativa, setAbriendoComparativa] = useState(false)
  useEffect(() => { setDiaElegido(null) }, [loteId, curva?.dia_actual])
  const diaSeleccionado = Math.min(diaFinal, Math.max(primerDia, diaElegido ?? Math.min(diaHoy, diaFinal)))

  function cambiarSeccion(nueva: SeccionGuia) {
    const siguientes = new URLSearchParams(parametros)
    if (nueva === 'curva') siguientes.delete('seccion')
    else siguientes.set('seccion', nueva)
    setParametros(siguientes, { replace: true })
  }

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
      <div className="page-container adm-page guia-page gdc">
        <nav className="gdc-miga" aria-label="Navegación">
          <Link className="gdc-volver-pill" to={rutaPadre}>
            <IcArrowRight size={15} className="gdc-volver-icono" aria-hidden="true" />
            <span>{textoVolver}</span>
          </Link>
        </nav>
        <header className="guia-resumen-lote">
          <div className="guia-cabecera-fila-superior">
            <div>
              <span className="guia-lote-badge">Guía de crecimiento</span>
              <h1 className="guia-lote-titulo">{lote ? lote.codigo : 'Lote no encontrado'}</h1>
              <p className="guia-lote-ubicacion">
                {lote ? `${lote.galpon.nombre} · ${lote.galpon.granja.nombre}` : 'El lote solicitado no está disponible.'}
              </p>
            </div>
          </div>
        </header>
        {guia.error ? (
          <div className="adm-alerta" role="alert">
            <span>{guia.error}</span>
            <button type="button" onClick={guia.recargar}>Reintentar</button>
          </div>
        ) : (
          <p className="adm-aviso">La guía de crecimiento está disponible para lotes activos.</p>
        )}
      </div>
    )
  }

  const referencia = curva?.referencias.genetica?.linea ?? null
  const diasConPesaje = curva?.serie.filter((punto) => punto.real_g !== null).map((punto) => punto.dia) ?? []
  const alertasDelCiclo = anomalias.datos?.anomalias ?? []
  const alertasEnRegla = [...severidadPorDia(alertasDelCiclo)].map(([dia, severidad]) => ({ dia, severidad }))
  const salida = guia.plan?.resultado.fecha_salida_calculada ?? null
  const pesoMeta = guia.plan ? guia.plan.peso_objetivo_g : curva?.peso_objetivo_g ?? null
  const detalleSalida = [
    salida ? formatearFechaCalendario(salida) : null,
    pesoMeta ? formatearPeso(pesoMeta) : null,
  ].filter(Boolean).join(' · ') || 'Sin meta definida'

  const fases = obtenerFasesCiclo(
    diaFinal,
    guia.alimento,
    guia.curva?.puntos,
    lote.cantidad_inicial,
    guia.mortalidad,
    lote.fecha_ingreso,
  )
  const etapaDia = obtenerEtapaDelDia(diaSeleccionado, fases)
  const totalMuertes = guia.mortalidad.reduce((total, m) => total + m.cantidad_aves, 0)
  const avesVivas = Math.max(0, lote.cantidad_inicial - totalMuertes)
  const mortalidadPct = lote.cantidad_inicial > 0 ? (totalMuertes / lote.cantidad_inicial) * 100 : 0
  const ultimoPesaje = curva?.resumen.ultimo_pesaje ?? null
  const rutaBitacora = esOperario
    ? `/bitacora?lote=${lote.id}&vista=peso`
    : `/granjas/galpones/${lote.galpon.id}?pestana=bitacora&vista=peso`

  return (
    <div className="page-container adm-page guia-page gdc">
      {guia.error && (
        <div className="adm-alerta" role="alert">
          <span>{guia.error}</span>
          <button type="button" onClick={guia.recargar} disabled={guia.guardando}>Reintentar</button>
        </div>
      )}

      <nav className="gdc-miga" aria-label="Navegación">
        <Link className="gdc-volver-pill" to={rutaPadre}>
          <IcArrowRight size={15} className="gdc-volver-icono" aria-hidden="true" />
          <span>{textoVolver}</span>
        </Link>
      </nav>

      <header className="gdc-cabecera" aria-label="Información del lote">
        <div className="gdc-cabecera-texto">
          <span className="adm-eyebrow">
            <span className="adm-eyebrow-punto" aria-hidden="true" />
            Lote · Seguimiento de crecimiento
          </span>
          <div className="gdc-titulo-fila">
            <h1 className="gdc-titulo">Guía de crecimiento</h1>
            <code className="gdc-codigo-pill">{lote.codigo}</code>
          </div>
          <p className="gdc-contexto">
            {lote.galpon.nombre} · {lote.galpon.granja.nombre}
            {lote.linea_genetica ? ` · Línea ${lote.linea_genetica.nombre}` : ''}
          </p>
        </div>

        <div className="gdc-cabecera-acciones">
          {puedeComparar && (
            <button
              type="button"
              className="adm-btn adm-btn--secundario"
              onClick={() => setAbriendoComparativa(true)}
            >
              Comparar lotes
            </button>
          )}
          <Link className="adm-btn adm-btn--primario" to={rutaBitacora}>
            + Registrar pesaje
          </Link>
        </div>
      </header>

      <ul className="gdc-indicadores" aria-label="Resumen del lote">
        <li>
          <span>Avance del ciclo</span>
          <strong>Día {diaHoy} / {diaFinal}</strong>
          <small>Encasetado el {formatearFechaCalendario(lote.fecha_ingreso)}</small>
        </li>
        <li>
          <span>Último peso</span>
          <strong>{ultimoPesaje ? formatearPeso(ultimoPesaje.peso_g) : '—'}</strong>
          <small>
            {ultimoPesaje
              ? `Día ${ultimoPesaje.dia} · ${diasConPesaje.length} ${diasConPesaje.length === 1 ? 'pesaje' : 'pesajes'}`
              : 'Sin pesajes registrados'}
          </small>
        </li>
        <li>
          <span>Meta de salida</span>
          <strong>{pesoMeta ? formatearPeso(pesoMeta) : 'Sin meta'}</strong>
          <small>{salida ? `Estimada ${formatearFechaCalendario(salida)}` : 'Defínela en Plan de salida'}</small>
        </li>
        <li>
          <span>Aves vivas</span>
          <strong>{avesVivas.toLocaleString('es-CO')}</strong>
          <small>
            {totalMuertes > 0
              ? `de ${lote.cantidad_inicial.toLocaleString('es-CO')} · ${unDecimal.format(mortalidadPct)} % mortalidad`
              : `${lote.cantidad_inicial.toLocaleString('es-CO')} iniciales · sin mortalidad`}
          </small>
        </li>
      </ul>

      <section className="gdc-ciclo" aria-labelledby="gdc-ciclo-titulo">
        <div className="gdc-ciclo-cabecera">
          <h2 id="gdc-ciclo-titulo">
            Día {diaHoy} <span>de {diaFinal}</span>
          </h2>
          <p className="gdc-ciclo-frase" aria-live="polite">{fraseDeCrecimiento(curva)}</p>
        </div>
        <ReglaCiclo
          primerDia={primerDia}
          diaFinal={diaFinal}
          diaActual={diaHoy}
          diaSeleccionado={diaSeleccionado}
          diasConPesaje={diasConPesaje}
          alertas={alertasEnRegla}
          etiquetaSalida={`Salida · día ${diaFinal}`}
          detalleSalida={detalleSalida}
          fases={fases}
          onDiaChange={setDiaElegido}
        />
        <AlertasTempranas
          datos={anomalias.datos}
          error={anomalias.error}
          cargando={anomalias.cargando}
          diaSeleccionado={diaSeleccionado}
          onReintentar={anomalias.recargar}
          onSeleccionarDia={setDiaElegido}
        />
      </section>

      <div className="gdc-tabs" role="tablist" aria-label="Secciones de la guía de crecimiento">
        <button
          type="button"
          role="tab"
          aria-selected={seccion === 'curva'}
          className={`gdc-tab${seccion === 'curva' ? ' is-activa' : ''}`}
          onClick={() => cambiarSeccion('curva')}
        >
          <IcChart size={15} aria-hidden="true" />
          <span>Curva y métricas</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={seccion === 'plan'}
          className={`gdc-tab${seccion === 'plan' ? ' is-activa' : ''}`}
          onClick={() => cambiarSeccion('plan')}
        >
          <IcSeed size={15} aria-hidden="true" />
          <span>Plan de salida y alimento</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={seccion === 'reportes'}
          className={`gdc-tab${seccion === 'reportes' ? ' is-activa' : ''}`}
          onClick={() => cambiarSeccion('reportes')}
        >
          <IcDoc size={15} aria-hidden="true" />
          <span>Reportes</span>
        </button>
      </div>

      {seccion === 'curva' && (
        <div className="gdc-cuerpo">
          <PanelCrecimiento
            loteId={lote.id}
            puedeComparar={puedeComparar}
            lote={lote}
            indicadores={guia.indicadores}
            curvaGenetica={guia.curva?.puntos ?? []}
            curva={curva}
            diaSeleccionado={diaSeleccionado}
            problema={proyeccion.problemaCurva}
            cargando={proyeccion.cargandoCurva}
            onReintentar={proyeccion.recargar}
          />
          <LecturaDelDia
            curva={curva}
            dia={diaSeleccionado}
            referencia={referencia}
            alertasDelDia={alertasDelCiclo.filter((alerta) => alerta.dia === diaSeleccionado)}
            etapaDia={etapaDia}
          />
        </div>
      )}

      {seccion === 'plan' && (
        <section className="gdc-cierre" aria-label="Plan de salida y alimentación">
          <div className="gdc-cierre-layout">
            <div className="gdc-cierre-col-plan">
              <MetaDelLote
                loteId={lote.id}
                plan={guia.plan}
                puedeRegistrar={permisos.registrar}
                cargando={guia.cargandoPlan}
                error={guia.errorPlan}
                ocupado={guia.guardando || guia.cargandoPlan || guia.cargandoDetalle}
                minLibras={MIN_PESO_OBJETIVO_G / 453.59237}
                onGuardar={guardarPesoObjetivo}
                onRecalcular={() => void ejecutarAccion(() => guia.recalcularPlan())}
                onReintentar={guia.recargar}
              />
              <ProyeccionFaena
                loteId={lote.id}
                curva={curva}
                plan={guia.plan}
                prediccion={proyeccion.prediccion}
                error={proyeccion.errorPrediccion}
                cargando={proyeccion.cargandoPrediccion}
              />
            </div>
            <div className="gdc-cierre-col-alimento">
              <ResumenAlimentacionLote
                plan={guia.plan}
                alimento={guia.alimento}
                fases={fases}
                lote={lote}
                mortalidad={guia.mortalidad}
                cargandoAlimento={guia.cargandoAlimento}
              />
            </div>
          </div>
        </section>
      )}

      {seccion === 'reportes' && (
        <section className="gdc-reportes-wrap" aria-label="Reportes y comparativa">
          <ReportesCrecimiento
            lote={lote}
            indicadores={guia.indicadores}
            curva={curva}
            alimento={guia.alimento}
            cargandoAlimento={guia.cargandoAlimento}
            onAbrirComparativa={puedeComparar ? () => setAbriendoComparativa(true) : undefined}
          />
        </section>
      )}

      {abriendoComparativa && (
        <ModalCompararLotes
          loteActualId={lote.id}
          onCerrar={() => setAbriendoComparativa(false)}
        />
      )}
    </div>
  )
}

export default GuiaCrecimientoPage
