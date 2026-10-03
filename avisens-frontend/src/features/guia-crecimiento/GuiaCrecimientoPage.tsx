import { useMemo, useState, type FormEvent } from 'react'
import CabeceraAdmin from '@shared/ui/admin/CabeceraAdmin'
import TarjetasResumen, { type Stat } from '@shared/ui/admin/TarjetasResumen'
import '@shared/ui/admin/AdminKit.css'
import { IcChart, IcCheck, IcEgg, IcScale } from '@shared/ui/icons/icons'
import GraficaCurva from './components/GraficaCurva'
import {
  diaDeVidaParaFecha,
  evaluarGuia,
  fechaParaDiaVida,
  gramosALibras,
  librasAGramos,
  calcularDesvioPct,
  interpolarPuntoEnDia,
  interpolarPesoEnDia,
  type EstadoGuia,
} from './model/guiaCrecimiento'
import { useGuiaCrecimiento } from './hooks/useGuiaCrecimiento'
import { mensajeDeError } from '@shared/utils/errores'
import './GuiaCrecimientoPage.css'

type ModoPlazo = 'fecha' | 'dia'

const ETIQUETAS_ESTADO: Record<EstadoGuia, string> = {
  calculado: 'Alcanzable',
  justo: 'Justo',
  no_alcanzable: 'No alcanzable',
  sin_curva: 'Sin curva genética',
  fuera_de_rango: 'Fuera del rango de la curva',
  datos_insuficientes: 'Datos insuficientes',
  plazo_vencido: 'Plazo vencido',
}

function numero(valor: string): number | null {
  if (!valor.trim()) return null
  const resultado = Number(valor)
  return Number.isFinite(resultado) ? resultado : null
}

function GuiaCrecimientoPage() {
  const guia = useGuiaCrecimiento()
  const [pesoLibras, setPesoLibras] = useState('')
  const [modoPlazo, setModoPlazo] = useState<ModoPlazo>('fecha')
  const [fechaPlazo, setFechaPlazo] = useState('')
  const [diaPlazo, setDiaPlazo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorPlan, setErrorPlan] = useState('')

  const fechaIngresoValida = typeof guia.loteSeleccionado?.fecha_ingreso === 'string' && guia.loteSeleccionado.fecha_ingreso.trim() !== ''
  const puntos = useMemo(() => guia.curva?.puntos.map((punto) => ({
    dia: Number(punto.dia),
    pesoEsperadoG: Number(punto.peso_esperado_g),
    consumoAcumuladoG: punto.consumo_acumulado_g === null ? null : Number(punto.consumo_acumulado_g),
    fcrObjetivo: punto.fcr_objetivo === null ? null : Number(punto.fcr_objetivo),
  })) ?? [], [guia.curva])
  const calculo = useMemo(() => {
    const libras = numero(pesoLibras)
    const pesoObjetivoG = libras === null ? null : librasAGramos(libras)
    const diaPlazoCalculado = !fechaIngresoValida
      ? null
      : modoPlazo === 'fecha'
        ? diaDeVidaParaFecha(guia.loteSeleccionado?.fecha_ingreso ?? '', fechaPlazo)
        : numero(diaPlazo)
    const resultado = pesoObjetivoG !== null && diaPlazoCalculado !== null && guia.diaActual !== null
      ? evaluarGuia(puntos, pesoObjetivoG, diaPlazoCalculado, guia.diaActual, guia.curva !== null)
      : null
    const puntoObjetivo = diaPlazoCalculado === null ? null : interpolarPuntoEnDia(puntos, diaPlazoCalculado)
    return { pesoObjetivoG, diaPlazoCalculado, resultado, puntoObjetivo }
  }, [diaPlazo, fechaIngresoValida, fechaPlazo, guia.curva, guia.diaActual, guia.loteSeleccionado, modoPlazo, pesoLibras, puntos])
  const { pesoObjetivoG, diaPlazoCalculado, resultado, puntoObjetivo } = calculo
  const fechaSalida = resultado?.diaObjetivo !== null && resultado?.diaObjetivo !== undefined && guia.loteSeleccionado
    ? fechaParaDiaVida(guia.loteSeleccionado.fecha_ingreso, resultado.diaObjetivo)
    : null
  const pesoEsperadoHoy = guia.diaActual === null ? null : interpolarPesoEnDia(puntos, guia.diaActual)
  const pesoReal = guia.indicadorReciente?.peso_promedio_g ?? guia.comparacion?.real ?.peso_promedio_g ?? null
  const pesoEsperadoHoyG = pesoEsperadoHoy?.estado === 'calculado' ? pesoEsperadoHoy.pesoEsperadoG : null
  const desvioPct = calcularDesvioPct(pesoReal, pesoEsperadoHoyG)
  const pesajes = guia.indicadores
    .filter((indicador) => indicador.dia_vida !== null && indicador.peso_promedio_g !== null)
    .map((indicador) => ({ dia: indicador.dia_vida ?? 0, pesoG: indicador.peso_promedio_g ?? 0 }))

  const stats: Stat[] = [
    { label: 'Día actual', valor: guia.diaActual ?? '—', icono: <IcChart size={18} />, tono: 'info' },
    { label: 'Aves alojadas', valor: guia.loteSeleccionado?.cantidad_inicial.toLocaleString('es-CO') ?? '—', icono: <IcEgg size={18} />, tono: 'neutral' },
    { label: 'Línea genética', valor: guia.loteSeleccionado?.linea_genetica?.nombre ?? 'Sin asignar', icono: <IcScale size={18} />, tono: guia.loteSeleccionado?.linea_genetica ? 'ok' : 'aviso' },
    { label: 'Puntos de curva', valor: guia.curva?.puntos.length ?? 0, icono: <IcCheck size={18} />, tono: guia.curva ? 'ok' : 'aviso' },
  ]

  function cambiarModo(modo: ModoPlazo) {
    setModoPlazo(modo)
    if (modo === 'fecha' && diaPlazo && guia.loteSeleccionado) {
      setFechaPlazo(fechaParaDiaVida(guia.loteSeleccionado.fecha_ingreso, Number(diaPlazo)) ?? '')
    }
    if (modo === 'dia' && fechaPlazo && guia.loteSeleccionado) {
      const dia = diaDeVidaParaFecha(guia.loteSeleccionado.fecha_ingreso, fechaPlazo)
      setDiaPlazo(dia === null ? '' : String(dia))
    }
  }

  async function usarComoPlan(evento: FormEvent) {
    evento.preventDefault()
    if (pesoObjetivoG === null) return
    setGuardando(true)
    setErrorPlan('')
    try {
      await guia.guardarPlan(pesoObjetivoG)
    } catch (error) {
      setErrorPlan(mensajeDeError(error, 'No se pudo guardar el plan del lote.'))
    } finally {
      setGuardando(false)
    }
  }

  if (guia.cargando && guia.lotes.length === 0) {
    return <div className="page-container adm-page"><p className="adm-vacio" role="status">Cargando lotes activos…</p></div>
  }

  return (
    <div className="page-container adm-page guia-page">
      <CabeceraAdmin
        titulo="Guía de peso"
        contexto={guia.loteSeleccionado?.codigo}
        subtitulo="Compara un peso objetivo y un plazo con la curva genética vigente del lote."
        migas={[{ label: 'Granja' }, { label: 'Guía de peso' }]}
      />

      {guia.error && <div className="adm-alerta" role="alert"><span>{guia.error}</span><button type="button" onClick={() => void guia.recargar()}>Reintentar</button></div>}

      {guia.lotes.length === 0 ? (
        <section className="adm-panel guia-vacio" aria-labelledby="guia-vacio-titulo">
          <h2 id="guia-vacio-titulo">No hay lotes activos</h2>
          <p>Cuando tengas un lote activo asociado a tu granja podrás consultar su guía de peso.</p>
        </section>
      ) : (
        <>
          <TarjetasResumen stats={stats} etiqueta="Resumen del lote seleccionado" />
          <section className="adm-panel guia-selector" aria-label="Lote seleccionado">
            <label className="guia-campo"><span>Lote activo</span><select value={guia.loteId ?? ''} onChange={(evento) => guia.seleccionarLote(Number(evento.target.value))}>
              {guia.lotes.map((lote) => <option key={lote.id} value={lote.id}>{lote.codigo} · {lote.galpon.nombre} · {lote.linea_genetica?.nombre ?? 'Sin línea genética'}</option>)}
            </select></label>
            {guia.loteSeleccionado && <dl className="guia-ficha-lote">
              <div><dt>Galpón</dt><dd>{guia.loteSeleccionado.galpon.nombre}</dd></div>
              <div><dt>Sexo</dt><dd>{guia.loteSeleccionado.sexo ?? 'Sin especificar'}</dd></div>
              <div><dt>Línea genética</dt><dd>{guia.loteSeleccionado.linea_genetica?.nombre ?? 'Sin asignar'}</dd></div>
              <div><dt>Día de vida</dt><dd>{guia.diaActual ?? '—'}</dd></div>
            </dl>}
            {guia.loteSeleccionado && !fechaIngresoValida && <p className="guia-error" role="alert">Este lote no tiene fecha de ingreso; no se puede convertir una fecha objetivo a día de vida.</p>}
          </section>

          <div className="guia-columnas">
            <section className="adm-panel" aria-labelledby="guia-formulario-titulo">
              <div className="guia-panel-titulo"><div><span className="adm-eyebrow">Decisión</span><h2 id="guia-formulario-titulo">¿Cuándo puede llegar?</h2></div></div>
              <form className="guia-formulario" onSubmit={(evento) => void usarComoPlan(evento)}>
                <label className="guia-campo"><span>Peso objetivo (libras)</span><input type="number" min="0" step="0.01" value={pesoLibras} onChange={(evento) => setPesoLibras(evento.target.value)} placeholder="Ej. 5.5" /><small>{pesoObjetivoG === null ? ' ' : `${pesoObjetivoG.toFixed(2)} g`}</small></label>
                <fieldset className="guia-plazo"><legend>Plazo</legend><div className="guia-segmentado"><button type="button" className={modoPlazo === 'fecha' ? 'activo' : ''} onClick={() => cambiarModo('fecha')}>Fecha objetivo</button><button type="button" className={modoPlazo === 'dia' ? 'activo' : ''} onClick={() => cambiarModo('dia')}>Día de vida</button></div>
                  {modoPlazo === 'fecha' ? <label className="guia-campo"><span>Fecha objetivo</span><input type="date" value={fechaPlazo} onChange={(evento) => setFechaPlazo(evento.target.value)} /></label> : <label className="guia-campo"><span>Día de vida objetivo</span><input type="number" min="1" step="1" value={diaPlazo} onChange={(evento) => setDiaPlazo(evento.target.value)} /></label>}
                  {diaPlazoCalculado !== null && <small>Equivale al día de vida {diaPlazoCalculado}{modoPlazo === 'dia' && guia.loteSeleccionado ? ` · ${fechaParaDiaVida(guia.loteSeleccionado.fecha_ingreso, diaPlazoCalculado) ?? ''}` : ''}</small>}
                  {guia.loteSeleccionado && modoPlazo === 'fecha' && !fechaIngresoValida && <small className="guia-error">Falta la fecha de ingreso del lote para calcular el plazo.</small>}
                  {diaPlazoCalculado !== null && puntoObjetivo?.estado === 'fuera_de_rango' && <small className="guia-error">El día objetivo debe estar dentro del rango disponible de la curva (días 1 a 42).</small>}
                </fieldset>
                {guia.cargando && guia.loteId !== null && <p className="guia-cargando" role="status">Cargando curva y pesajes…</p>}
                {resultado && <div className={`guia-resultado guia-resultado--${resultado.estado}`} aria-live="polite"><span className="guia-resultado-etiqueta">{ETIQUETAS_ESTADO[resultado.estado]}</span><strong>{resultado.diaObjetivo === null ? 'No se puede calcular el día objetivo' : `Día ${resultado.diaObjetivo}`}</strong><p>{resultado.estado === 'calculado' ? `La curva deja ${resultado.margenDias} días de margen. Fecha estimada: ${fechaSalida ?? '—'}.` : resultado.estado === 'justo' ? `La curva llega prácticamente en el plazo. Fecha estimada: ${fechaSalida ?? '—'}.` : resultado.estado === 'no_alcanzable' ? `En el plazo espera ${resultado.pesoEsperadoEnPlazoG?.toFixed(0) ?? '—'} g (${gramosALibras(resultado.pesoEsperadoEnPlazoG ?? 0).toFixed(2)} lb). Alternativas: mover la fecha a ${fechaSalida ?? '—'} o bajar el objetivo a ${gramosALibras(resultado.pesoEsperadoEnPlazoG ?? 0).toFixed(2)} lb.` : resultado.estado === 'sin_curva' && !guia.loteSeleccionado?.linea_genetica ? 'Este lote no tiene una línea genética asignada. Asígnala al lote para consultar su curva de crecimiento.' : resultado.estado === 'sin_curva' ? 'La línea genética está asignada, pero no tiene una curva publicada y vigente para este sexo.' : 'Revisa el rango de la curva y el plazo ingresado.'}</p></div>}
                <button type="submit" className="adm-btn adm-btn--primario" disabled={pesoObjetivoG === null || guardando || guia.loteId === null}> {guardando ? 'Guardando…' : 'Usar como plan del lote'}</button>
                <small className="guia-nota">El backend guarda el peso objetivo del plan; el plazo se usa aquí como guía y no se almacena.</small>
                {errorPlan && <p className="guia-error" role="alert">{errorPlan}</p>}
              </form>
            </section>

            <section className="adm-panel guia-situacion" aria-labelledby="guia-situacion-titulo"><span className="adm-eyebrow">Seguimiento</span><h2 id="guia-situacion-titulo">Situación real del lote</h2><p>Día actual: <strong>{guia.diaActual ?? '—'}</strong></p><p>Último peso real: <strong>{pesoReal === null ? 'Sin pesaje' : `${pesoReal.toFixed(0)} g`}</strong></p><p>Peso esperado hoy: <strong>{pesoEsperadoHoyG === null ? '—' : `${pesoEsperadoHoyG.toFixed(0)} g`}</strong></p>{desvioPct !== null && <p className={desvioPct < 0 ? 'guia-desvio guia-desvio--bajo' : 'guia-desvio'}>Desvío: <strong>{desvioPct >= 0 ? '+' : ''}{desvioPct.toFixed(1)}%</strong></p>}{desvioPct !== null && desvioPct < 0 && <div className="guia-aviso" role="status">Este lote está por debajo de la curva estándar; por eso la curva puede ser optimista para su situación real.</div>}</section>
          </div>

          <section className="adm-panel guia-panel" aria-labelledby="guia-recursos-titulo"><span className="adm-eyebrow">Referencia</span><h2 id="guia-recursos-titulo">Qué necesitas para lograrlo</h2>{guia.curva ? <div className="guia-recursos"><p>Consumo acumulado por ave al día objetivo: <strong>{puntoObjetivo?.estado === 'calculado' && puntoObjetivo.consumoAcumuladoG !== null ? `${puntoObjetivo.consumoAcumuladoG.toFixed(0)} g` : 'Dato no disponible en la tabla'}</strong></p><p>FCR objetivo: <strong>{puntoObjetivo?.estado === 'calculado' && puntoObjetivo.fcrObjetivo !== null ? puntoObjetivo.fcrObjetivo.toFixed(2) : 'Dato no disponible en la tabla'}</strong></p></div> : <p>No hay curva genética vigente para esta línea y sexo.</p>}</section>

          {guia.curva && <section className="adm-panel guia-panel" aria-labelledby="guia-grafica-titulo-panel"><span className="adm-eyebrow">Evolución</span><h2 id="guia-grafica-titulo-panel">Curva genética y pesajes</h2><GraficaCurva puntos={guia.curva.puntos} diaObjetivo={resultado?.diaObjetivo ?? null} pesoObjetivoG={pesoObjetivoG} diaPlazo={diaPlazoCalculado} pesajes={pesajes} /></section>}
        </>
      )}
    </div>
  )
}

export default GuiaCrecimientoPage