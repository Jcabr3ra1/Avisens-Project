import { useMemo } from 'react'
import { getRol } from '@shared/api'
import { permisosDePlan } from '@shared/auth/permisos'
import CabeceraAdmin from '@shared/ui/admin/CabeceraAdmin'
import TarjetasResumen, { type Stat } from '@shared/ui/admin/TarjetasResumen'
import '@shared/ui/admin/AdminKit.css'
import { IcChart, IcCheck, IcEgg, IcScale } from '@shared/ui/icons/icons'
import FormularioPesoObjetivo from '../lotes/components/FormularioPesoObjetivo'
import {
  calcularDesvioPct,
  interpolarPesoEnDia,
  interpolarPuntoEnDia,
} from './model/guiaCrecimiento'
import { useGuiaCrecimiento } from './hooks/useGuiaCrecimiento'
import './GuiaCrecimientoPage.css'

function fecha(valor: string | null): string {
  if (!valor) return '—'
  return new Date(valor).toLocaleDateString('es-CO')
}

function kilos(valor: string | null): string {
  if (valor === null) return 'Sin estimación'
  const numeroKilos = Number(valor)
  return Number.isFinite(numeroKilos) ? `${numeroKilos.toLocaleString('es-CO', { maximumFractionDigits: 0 })} kg` : 'Sin estimación'
}

function gramos(valor: number | null): string {
  return valor === null ? 'Sin estimación' : `${valor.toLocaleString('es-CO', { maximumFractionDigits: 0 })} g`
}

function etiquetaEstadoPlan(estado: string): string {
  const etiquetas: Record<string, string> = {
    calculado: 'Calculado',
    sin_curva: 'Sin curva genética',
    fuera_de_rango: 'Fuera del rango de la curva',
    datos_insuficientes: 'Datos insuficientes',
  }
  return etiquetas[estado] ?? estado
}

function etiquetaEstadoAlimento(estado: string): string {
  const etiquetas: Record<string, string> = {
    calculado: 'Calculado',
    plan_sin_dia_objetivo: 'Sin día objetivo',
    sin_consumo_en_curva: 'Sin consumo en la curva',
    consumo_insuficiente: 'Consumo insuficiente',
    consumo_fuera_de_rango: 'Consumo fuera de rango',
  }
  return etiquetas[estado] ?? estado
}

const MIN_PESO_OBJETIVO_G = 1000
const MIN_DIA_OBJETIVO = 30

function GuiaCrecimientoPage() {
  const guia = useGuiaCrecimiento()
  const permisos = permisosDePlan(getRol())
  const puntos = useMemo(() => guia.curva?.puntos.map((punto) => ({
    dia: Number(punto.dia),
    pesoEsperadoG: Number(punto.peso_esperado_g),
    consumoAcumuladoG: punto.consumo_acumulado_g === null ? null : Number(punto.consumo_acumulado_g),
    fcrObjetivo: punto.fcr_objetivo === null ? null : Number(punto.fcr_objetivo),
  })) ?? [], [guia.curva])
  const pesoEsperadoHoy = guia.diaActual === null ? null : interpolarPesoEnDia(puntos, guia.diaActual)
  const puntoActual = guia.diaActual === null ? null : interpolarPuntoEnDia(puntos, guia.diaActual)
  const pesoMinimoDia30 = interpolarPesoEnDia(puntos, MIN_DIA_OBJETIVO)
  const pesoReal = guia.indicadorReciente?.peso_promedio_g ?? guia.comparacion?.real?.peso_promedio_g ?? null
  const pesoEsperadoHoyG = pesoEsperadoHoy?.estado === 'calculado' ? pesoEsperadoHoy.pesoEsperadoG : null
  const desvioPct = calcularDesvioPct(pesoReal, pesoEsperadoHoyG)
  async function guardarPesoObjetivo(pesoObjetivoG: number) {
    if (pesoObjetivoG < MIN_PESO_OBJETIVO_G) {
      throw new Error('El peso objetivo mínimo es de 1 kg (aproximadamente 2,21 lb).')
    }
    if (pesoMinimoDia30.estado === 'calculado' && pesoObjetivoG < pesoMinimoDia30.pesoEsperadoG) {
      throw new Error('El peso objetivo debe corresponder a un crecimiento de al menos 30 días.')
    }
    await guia.crearPlan(pesoObjetivoG)
  }
  const stats: Stat[] = [
    { label: 'Día actual', valor: guia.diaActual ?? '—', icono: <IcChart size={18} />, tono: 'info' },
    { label: 'Aves alojadas', valor: guia.loteSeleccionado?.cantidad_inicial.toLocaleString('es-CO') ?? '—', icono: <IcEgg size={18} />, tono: 'neutral' },
    { label: 'Línea genética', valor: guia.loteSeleccionado?.linea_genetica?.nombre ?? 'Sin asignar', icono: <IcScale size={18} />, tono: guia.loteSeleccionado?.linea_genetica ? 'ok' : 'aviso' },
    { label: 'Puntos de curva', valor: guia.curva?.puntos.length ?? 0, icono: <IcCheck size={18} />, tono: guia.curva ? 'ok' : 'aviso' },
  ]

  if (guia.cargando && guia.lotes.length === 0) {
    return <div className="page-container adm-page"><p className="adm-vacio" role="status">Cargando lotes activos…</p></div>
  }

  return (
    <div className="page-container adm-page guia-page">
      <CabeceraAdmin titulo="Guía de peso" contexto={guia.loteSeleccionado?.codigo} subtitulo="Estima cuándo alcanzará el peso objetivo usando la curva genética y el historial de la granja." migas={[{ label: 'Granja' }, { label: 'Guía de peso' }]} />
      {guia.error && <div className="adm-alerta" role="alert"><span>{guia.error}</span><button type="button" onClick={() => void guia.recargar()}>Reintentar</button></div>}
      {guia.lotes.length === 0 ? (
        <section className="adm-panel guia-vacio" aria-labelledby="guia-vacio-titulo"><h2 id="guia-vacio-titulo">No hay lotes activos</h2><p>Cuando tengas un lote activo asociado a tu granja podrás consultar su guía de peso.</p></section>
      ) : (
        <>
          <TarjetasResumen stats={stats} etiqueta="Resumen del lote seleccionado" />
          <section className="adm-panel guia-selector" aria-label="Lote seleccionado">
            <label className="guia-campo"><span>Lote activo</span><select value={guia.loteId ?? ''} onChange={(evento) => guia.seleccionarLote(Number(evento.target.value))}>{guia.lotes.map((lote) => <option key={lote.id} value={lote.id}>{lote.codigo} · {lote.galpon.nombre} · {lote.linea_genetica?.nombre ?? 'Sin línea genética'}</option>)}</select></label>
            {guia.loteSeleccionado && <dl className="guia-ficha-lote"><div><dt>Galpón</dt><dd>{guia.loteSeleccionado.galpon.nombre}</dd></div><div><dt>Sexo</dt><dd>{guia.loteSeleccionado.sexo ?? 'Sin especificar'}</dd></div><div><dt>Línea genética</dt><dd>{guia.loteSeleccionado.linea_genetica?.nombre ?? 'Sin asignar'}</dd></div><div><dt>Día de vida</dt><dd>{guia.diaActual ?? '—'}</dd></div></dl>}
          </section>

          <div className="guia-columnas">
            <section className="adm-panel guia-situacion" aria-labelledby="guia-situacion-titulo"><span className="adm-eyebrow">Seguimiento</span><h2 id="guia-situacion-titulo">Situación real del lote</h2><p>Día actual: <strong>{guia.diaActual ?? '—'}</strong></p><p>Último peso real: <strong>{pesoReal === null ? 'Sin pesaje' : `${pesoReal.toFixed(0)} g`}</strong></p><p>Peso esperado hoy: <strong>{pesoEsperadoHoyG === null ? '—' : `${pesoEsperadoHoyG.toFixed(0)} g`}</strong></p>{desvioPct !== null && <p className={desvioPct < 0 ? 'guia-desvio guia-desvio--bajo' : 'guia-desvio'}>Desvío: <strong>{desvioPct >= 0 ? '+' : ''}{desvioPct.toFixed(1)}%</strong></p>}{desvioPct !== null && desvioPct < 0 && <div className="guia-aviso" role="status">Este lote está por debajo de la curva estándar; la fecha puede ser optimista para su situación real.</div>}</section>
          </div>

          <section className="adm-panel guia-panel guia-datos-panel" aria-labelledby="guia-plan-titulo">
            <div className="guia-panel-titulo"><div><span className="adm-eyebrow">Plan productivo</span><h2 id="guia-plan-titulo">Objetivo del lote</h2></div>{guia.plan && permisos.registrar && <button type="button" className="adm-btn adm-btn--secundario" onClick={() => { void guia.recalcularPlan() }} disabled={guia.cargandoPlan}>{guia.cargandoPlan ? 'Recalculando…' : 'Recalcular plan'}</button>}</div>
            {permisos.registrar && !guia.cargandoPlan && !guia.errorPlan && <FormularioPesoObjetivo key={guia.plan?.id ?? 'nuevo'} pesoActualG={guia.plan?.peso_objetivo_g ?? null} minLibras={MIN_PESO_OBJETIVO_G / 453.59237} onEnviar={guardarPesoObjetivo} />}
            {guia.cargandoPlan ? <p className="guia-cargando" role="status">Cargando plan productivo…</p> : guia.errorPlan ? <p className="guia-error" role="alert">{guia.errorPlan}</p> : guia.plan === null ? <p className="guia-nota">Este lote todavía no tiene un plan productivo.</p> : <div className="guia-datos-grid"><div><span>Peso objetivo</span><strong>{(guia.plan.peso_objetivo_g / 453.59237).toFixed(2)} lb</strong></div><div><span>Día objetivo</span><strong>{guia.plan.resultado.dia_objetivo ?? '—'}</strong></div><div><span>Salida calculada</span><strong>{fecha(guia.plan.resultado.fecha_salida_calculada)}</strong></div><div><span>Estado</span><strong>{etiquetaEstadoPlan(guia.plan.estado_dia)}</strong></div></div>}
          </section>

          <section className="adm-panel guia-panel guia-datos-panel" aria-labelledby="guia-alimento-titulo">
            <div className="guia-panel-titulo"><div><span className="adm-eyebrow">Alimento proyectado</span><h2 id="guia-alimento-titulo">Consumo del ciclo</h2></div>{guia.alimento && permisos.registrar && <button type="button" className="adm-btn adm-btn--secundario" onClick={() => { void guia.guardarPlanAlimento() }} disabled={guia.cargandoAlimento}>{guia.cargandoAlimento ? 'Calculando…' : 'Recalcular alimento'}</button>}</div>
            {guia.cargandoAlimento ? <p className="guia-cargando" role="status">Cargando estimación de alimento…</p> : guia.errorAlimento ? <p className="guia-error" role="alert">{guia.errorAlimento}</p> : guia.alimento === null ? <><p className="guia-nota">Este lote todavía no tiene una estimación de alimento.</p>{guia.plan?.estado_dia === 'calculado' && permisos.registrar && <button type="button" className="adm-btn adm-btn--secundario" onClick={() => { void guia.guardarPlanAlimento() }}>Generar estimación</button>}</> : <><div className="guia-datos-grid"><div><span>Total del ciclo</span><strong>{kilos(guia.alimento.alimento_estimado.total_kg)}</strong></div><div><span>Hasta el corte</span><strong>{kilos(guia.alimento.alimento_estimado.hasta_corte_kg)}</strong></div><div><span>Pendiente desde hoy</span><strong>{kilos(guia.alimento.alimento_estimado.pendiente_desde_hoy_kg)}</strong></div><div><span>Consumo por ave</span><strong>{gramos(guia.alimento.resultado.consumo_por_ave_g)}</strong></div></div><p className="guia-nota">Marca: <strong>{guia.alimento.desglose.marca_alimento_snapshot ?? 'Sin asignar'}</strong> · Estado: <strong>{etiquetaEstadoAlimento(guia.alimento.estado_alimento)}</strong></p>{guia.alimento.alimento_estimado.pendiente_desde_hoy_kg === null && guia.alimento.alimento_estimado.requiere_recalculo && <p className="guia-aviso">El pendiente desde hoy no está disponible porque la estimación necesita recálculo.</p>}{guia.alimento.desglose.renglones.length > 0 && <div className="guia-tabla-contenedor"><table className="guia-tabla"><thead><tr><th>Etapa</th><th>Días</th><th>Por ave</th><th>Total</th></tr></thead><tbody>{guia.alimento.desglose.renglones.map((renglon) => <tr key={renglon.orden}><td>{renglon.tipo_alimento_nombre_snapshot ?? renglon.etapa ?? 'Sin asignar'}</td><td>{renglon.dia_inicio}–{renglon.dia_fin}</td><td>{gramos(renglon.consumo_por_ave_g)}</td><td>{kilos(String(renglon.consumo_total_kg))}</td></tr>)}</tbody></table></div>}</>}
          </section>

          <section className="adm-panel guia-panel" aria-labelledby="guia-recursos-titulo"><span className="adm-eyebrow">Referencia de la curva</span><h2 id="guia-recursos-titulo">Referencia para el día actual</h2>{puntoActual?.estado === 'calculado' ? <div className="guia-recursos"><p>Consumo acumulado por ave: <strong>{puntoActual.consumoAcumuladoG === null ? 'Dato no disponible' : gramos(puntoActual.consumoAcumuladoG)}</strong></p><p>FCR objetivo: <strong>{puntoActual.fcrObjetivo === null ? 'Dato no disponible' : puntoActual.fcrObjetivo.toFixed(2)}</strong></p></div> : <p>No hay datos de curva para el día actual.</p>}</section>
        </>
      )}
    </div>
  )
}

export default GuiaCrecimientoPage