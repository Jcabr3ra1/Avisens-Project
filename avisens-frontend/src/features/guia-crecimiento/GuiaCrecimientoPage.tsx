import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getRol } from '@shared/api'
import { permisosDePlan } from '@shared/auth/permisos'
import { diasDeVida, formatearFechaCalendario } from '@shared/utils/fechas'
import CabeceraAdmin from '@shared/ui/admin/CabeceraAdmin'
import TarjetasResumen, { type Stat } from '@shared/ui/admin/TarjetasResumen'
import '@shared/ui/admin/AdminKit.css'
import { IcChart, IcCheck, IcEgg, IcScale } from '@shared/ui/icons/icons'
import FormularioPesoObjetivo from '../lotes/components/FormularioPesoObjetivo'
import { DESCRIPCION_DESACTUALIZADO_PLAN, etiquetaEstadoPlan } from '../lotes/model/planLoteVista'
import { etiquetaEstadoAlimento, etiquetaMotivo } from '../lotes/model/planAlimentoVista'
import { calcularDesvioPct, interpolarPesoEnDia, interpolarPuntoEnDia, obtenerPesoVerificado } from './model/guiaCrecimiento'
import { useGuiaCrecimiento } from './hooks/useGuiaCrecimiento'
import './GuiaCrecimientoPage.css'

function kilos(valor: string | null): string {
  if (valor === null) return 'Sin estimación'
  const numero = Number(valor)
  return Number.isFinite(numero) ? `${numero.toLocaleString('es-CO', { maximumFractionDigits: 0 })} kg` : 'Sin estimación'
}

function gramos(valor: number | null): string {
  return valor === null ? 'Sin estimación' : `${valor.toLocaleString('es-CO', { maximumFractionDigits: 0 })} g`
}

const MIN_PESO_OBJETIVO_G = 1000
const MIN_DIA_OBJETIVO = 30

function GuiaCrecimientoPage() {
  const [parametros] = useSearchParams()
  const valorLote = parametros.get('lote')
  const loteId = valorLote && /^[1-9]\d*$/.test(valorLote) && Number.isSafeInteger(Number(valorLote))
    ? Number(valorLote) : null
  const guia = useGuiaCrecimiento(loteId)
  const permisos = permisosDePlan(getRol())
  const lote = guia.loteSeleccionado
  const rutaPadre = lote ? `/lotes?galpon=${lote.galpon.id}` : '/lotes'
  const puntos = useMemo(() => guia.curva?.puntos.map((punto) => ({
    dia: Number(punto.dia), pesoEsperadoG: Number(punto.peso_esperado_g),
    consumoAcumuladoG: punto.consumo_acumulado_g === null ? null : Number(punto.consumo_acumulado_g),
    fcrObjetivo: punto.fcr_objetivo === null ? null : Number(punto.fcr_objetivo),
  })) ?? [], [guia.curva])
  const pesoEsperadoHoy = guia.diaActual === null ? null : interpolarPesoEnDia(puntos, guia.diaActual)
  const puntoActual = guia.diaActual === null ? null : interpolarPuntoEnDia(puntos, guia.diaActual)
  const pesoMinimoDia30 = interpolarPesoEnDia(puntos, MIN_DIA_OBJETIVO)
  const pesaje = obtenerPesoVerificado(guia.indicadorReciente)
  const pesoReal = pesaje?.gramos ?? null
  const diaPesaje = lote && pesaje && pesaje.fecha.slice(0, 10) >= lote.fecha_ingreso.slice(0, 10)
    ? diasDeVida(lote.fecha_ingreso.slice(0, 10), new Date(`${pesaje.fecha.slice(0, 10)}T00:00:00`)) : null
  const referenciaPesaje = diaPesaje !== null && Number.isFinite(diaPesaje) ? interpolarPesoEnDia(puntos, diaPesaje) : null
  const pesoEsperadoHoyG = pesoEsperadoHoy?.estado === 'calculado' ? pesoEsperadoHoy.pesoEsperadoG : null
  const desvioPct = calcularDesvioPct(pesoReal, referenciaPesaje?.estado === 'calculado' ? referenciaPesaje.pesoEsperadoG : null)

  async function guardarPesoObjetivo(pesoObjetivoG: number) {
    if (guia.cargandoDetalle) throw new Error('Espera a que termine de cargar la curva del lote.')
    if (pesoObjetivoG < MIN_PESO_OBJETIVO_G) throw new Error('El peso objetivo mínimo es de 1 kg (aproximadamente 2,21 lb).')
    if (pesoMinimoDia30.estado === 'calculado' && pesoObjetivoG < pesoMinimoDia30.pesoEsperadoG) {
      throw new Error('El peso objetivo debe corresponder a un crecimiento de al menos 30 días.')
    }
    await guia.crearPlan(pesoObjetivoG)
  }

  async function ejecutarAccion(accion: () => Promise<unknown>) {
    try { await accion() } catch {
      // El hook muestra el error de la operación en su sección correspondiente.
    }
  }

  const cabecera = (
    <CabeceraAdmin
      titulo="Guía de peso" contexto={lote?.codigo}
      subtitulo="Referencia de crecimiento y planificación del lote seleccionado."
      migas={[{ label: 'Lotes', to: rutaPadre }, ...(lote ? [{ label: lote.codigo }] : []), { label: 'Guía de peso' }]}
      acciones={<Link className="adm-btn adm-btn--secundario" to={rutaPadre}>Volver a lotes</Link>}
    />
  )

  if (loteId === null) {
    return <div className="page-container adm-page guia-page">{cabecera}<p className="adm-aviso">Abre la guía desde «Ver plan» en el lote que quieres consultar.</p></div>
  }
  if (guia.cargandoLote) {
    return <div className="page-container adm-page guia-page">{cabecera}<p className="adm-vacio" role="status">Cargando lote…</p></div>
  }
  if (lote === null || lote.estado !== 'activo') {
    return <div className="page-container adm-page guia-page">{cabecera}{guia.error ? <div className="adm-alerta" role="alert"><span>{guia.error}</span><button type="button" onClick={guia.recargar}>Reintentar</button></div> : <p className="adm-aviso">La guía de crecimiento está disponible para lotes activos.</p>}</div>
  }

  const stats: Stat[] = [
    { label: 'Día actual', valor: guia.diaActual ?? '—', icono: <IcChart size={18} />, tono: 'info' },
    { label: 'Aves alojadas', valor: lote.cantidad_inicial.toLocaleString('es-CO'), icono: <IcEgg size={18} />, tono: 'neutral' },
    { label: 'Línea genética', valor: lote.linea_genetica?.nombre ?? 'Sin asignar', icono: <IcScale size={18} />, tono: lote.linea_genetica ? 'ok' : 'aviso' },
    { label: 'Puntos de curva', valor: guia.curva?.puntos.length ?? 0, icono: <IcCheck size={18} />, tono: guia.curva ? 'ok' : 'aviso' },
  ]
  const alimento = guia.alimento
  const alimentoAnterior = alimento !== null && !alimento.plan_vigente?.es_el_mismo
  const puedeCalcularAlimento = guia.plan?.estado_dia === 'calculado' && !guia.plan.desactualizado

  return (
    <div className="page-container adm-page guia-page">
      {cabecera}
      {guia.error && <div className="adm-alerta" role="alert"><span>{guia.error}</span><button type="button" onClick={guia.recargar} disabled={guia.guardando}>Reintentar</button></div>}
      <TarjetasResumen stats={stats} etiqueta="Resumen del lote seleccionado" />
      <section className="adm-panel guia-selector" aria-label="Lote seleccionado">
        <div className="guia-campo"><span>Lote</span><strong>{lote.codigo}</strong></div>
        <dl className="guia-ficha-lote">
          <div><dt>Galpón</dt><dd>{lote.galpon.nombre}</dd></div>
          <div><dt>Sexo</dt><dd>{lote.sexo ?? 'Sin especificar'}</dd></div>
          <div><dt>Línea genética</dt><dd>{lote.linea_genetica?.nombre ?? 'Sin asignar'}</dd></div>
          <div><dt>Día de vida</dt><dd>{guia.diaActual ?? '—'}</dd></div>
        </dl>
      </section>

      <div className="guia-columnas">
        <section className="adm-panel guia-situacion" aria-labelledby="guia-situacion-titulo">
          <span className="adm-eyebrow">Seguimiento</span><h2 id="guia-situacion-titulo">Situación real del lote</h2>
          {guia.cargandoDetalle ? <p role="status">Cargando seguimiento…</p> : <>
            <p>Día actual: <strong>{guia.diaActual ?? '—'}</strong></p>
            <p>Último peso verificado: <strong>{pesoReal === null ? 'Sin peso verificado' : `${pesoReal.toFixed(0)} g`}</strong></p>
            {pesaje && <p>Fecha del pesaje: <strong>{formatearFechaCalendario(pesaje.fecha)}</strong></p>}
            {guia.indicadorReciente && !pesaje && <p className="guia-aviso" role="status">El último cálculo no tiene un peso verificado. Revisa los registros del lote antes de comparar.</p>}
            <p>Peso esperado hoy: <strong>{pesoEsperadoHoyG === null ? '—' : `${pesoEsperadoHoyG.toFixed(0)} g`}</strong></p>
            {desvioPct !== null && <p className={desvioPct < 0 ? 'guia-desvio guia-desvio--bajo' : 'guia-desvio'}>Desvío en la fecha del pesaje: <strong>{desvioPct >= 0 ? '+' : ''}{desvioPct.toFixed(1)}%</strong></p>}
            {desvioPct !== null && desvioPct < 0 && <div className="guia-aviso" role="status">Este lote está por debajo de la curva estándar; la fecha puede ser optimista para su situación real.</div>}
          </>}
        </section>
      </div>

      <section className="adm-panel guia-panel guia-datos-panel" aria-labelledby="guia-plan-titulo">
        <div className="guia-panel-titulo">
          <div><span className="adm-eyebrow">Plan productivo</span><h2 id="guia-plan-titulo">Objetivo del lote</h2></div>
          {guia.plan && permisos.registrar && <button type="button" className="adm-btn adm-btn--secundario" onClick={() => void ejecutarAccion(() => guia.recalcularPlan())} disabled={guia.guardando || guia.cargandoPlan || guia.cargandoDetalle}>{guia.cargandoPlan ? 'Recalculando…' : 'Recalcular plan'}</button>}
        </div>
        {guia.plan?.desactualizado && <div className="adm-alerta" role="status"><strong>Plan desactualizado. </strong><span>{DESCRIPCION_DESACTUALIZADO_PLAN} Los resultados corresponden al plan guardado; se necesita recalcularlo.</span></div>}
        {permisos.registrar && (guia.plan !== null || (!guia.cargandoPlan && !guia.errorPlan)) && (
          <FormularioPesoObjetivo
            key={`${lote.id}-${guia.plan?.id ?? 'nuevo'}`}
            pesoActualG={guia.plan?.peso_objetivo_g ?? null}
            minLibras={MIN_PESO_OBJETIVO_G / 453.59237}
            deshabilitado={guia.guardando || guia.cargandoPlan || guia.cargandoDetalle}
            onEnviar={guardarPesoObjetivo}
          />
        )}
        {guia.errorPlan && <div className="guia-error" role="alert"><span>{guia.errorPlan}</span><button type="button" onClick={guia.recargar} disabled={guia.guardando}>Reintentar carga</button></div>}
        {guia.cargandoPlan ? <p className="guia-cargando" role="status">Cargando plan productivo…</p> : guia.plan === null ? <p className="guia-nota">Este lote todavía no tiene un plan productivo.</p> : (
          <div className="guia-datos-grid">
            <div><span>Peso objetivo</span><strong>{(guia.plan.peso_objetivo_g / 453.59237).toFixed(2)} lb</strong></div>
            <div><span>Día objetivo</span><strong>{guia.plan.resultado.dia_objetivo ?? '—'}</strong></div>
            <div><span>Salida calculada</span><strong>{formatearFechaCalendario(guia.plan.resultado.fecha_salida_calculada)}</strong></div>
            <div><span>Estado</span><strong>{guia.plan.desactualizado ? 'Desactualizado' : etiquetaEstadoPlan(guia.plan.estado_dia)}</strong></div>
          </div>
        )}
      </section>

      <section className="adm-panel guia-panel guia-datos-panel" aria-labelledby="guia-alimento-titulo">
        <div className="guia-panel-titulo">
          <div><span className="adm-eyebrow">Alimento proyectado</span><h2 id="guia-alimento-titulo">Consumo del ciclo</h2></div>
          {alimento && permisos.registrar && <button type="button" className="adm-btn adm-btn--secundario" onClick={() => void ejecutarAccion(() => guia.guardarPlanAlimento())} disabled={guia.guardando || guia.cargandoAlimento || !puedeCalcularAlimento}>{guia.cargandoAlimento ? 'Calculando…' : 'Recalcular alimento'}</button>}
        </div>
        {!puedeCalcularAlimento && guia.plan && <p className="guia-aviso">Para estimar el alimento se necesita un plan actualizado con día objetivo calculado.</p>}
        {guia.cargandoAlimento ? <p className="guia-cargando" role="status">Cargando estimación de alimento…</p> : guia.errorAlimento ? <div className="guia-error" role="alert"><span>{guia.errorAlimento}</span><button type="button" onClick={guia.recargar} disabled={guia.guardando}>Reintentar carga</button></div> : alimento === null ? <>
          <p className="guia-nota">Este lote todavía no tiene una estimación de alimento.</p>
          {puedeCalcularAlimento && permisos.registrar && <button type="button" className="adm-btn adm-btn--secundario" onClick={() => void ejecutarAccion(() => guia.guardarPlanAlimento())} disabled={guia.guardando}>Generar estimación</button>}
        </> : <>
          {alimentoAnterior && <p className="guia-aviso" role="status">Esta estimación pertenece a una versión anterior del plan. Los valores siguientes corresponden a esa estimación guardada.</p>}
          {alimento.desactualizado && <div className="guia-aviso" role="status"><strong>Estimación de alimento desactualizada.</strong><ul>{alimento.motivos_desactualizacion.map((motivo) => <li key={motivo}>{etiquetaMotivo(motivo)}</li>)}</ul></div>}
          <div className="guia-datos-grid">
            <div><span>{alimentoAnterior ? 'Total del ciclo anterior' : 'Total del ciclo'}</span><strong>{kilos(alimento.alimento_estimado.total_kg)}</strong></div>
            <div><span>Hasta el corte</span><strong>{kilos(alimento.alimento_estimado.hasta_corte_kg)}</strong></div>
            <div><span>Pendiente desde hoy</span><strong>{kilos(alimento.alimento_estimado.pendiente_desde_hoy_kg)}</strong></div>
            <div><span>Consumo por ave</span><strong>{gramos(alimento.resultado.consumo_por_ave_g)}</strong></div>
          </div>
          <p className="guia-nota">Marca: <strong>{alimento.desglose.marca_alimento_snapshot ?? 'Sin asignar'}</strong> · Estado: <strong>{etiquetaEstadoAlimento(alimento.estado_alimento)}</strong></p>
          {alimento.alimento_estimado.pendiente_desde_hoy_kg === null && alimento.alimento_estimado.requiere_recalculo && <p className="guia-aviso">El pendiente desde hoy no está disponible porque la estimación necesita recálculo.</p>}
          {alimento.desglose.renglones.length > 0 && <div className="guia-tabla-contenedor"><table className="guia-tabla"><thead><tr><th>Etapa</th><th>Días</th><th>Por ave</th><th>Total</th></tr></thead><tbody>{alimento.desglose.renglones.map((renglon) => <tr key={renglon.orden}><td>{renglon.tipo_alimento_nombre_snapshot ?? renglon.etapa ?? 'Sin asignar'}</td><td>{renglon.dia_inicio}–{renglon.dia_fin}</td><td>{gramos(renglon.consumo_por_ave_g)}</td><td>{kilos(String(renglon.consumo_total_kg))}</td></tr>)}</tbody></table></div>}
        </>}
      </section>

      <section className="adm-panel guia-panel" aria-labelledby="guia-recursos-titulo">
        <span className="adm-eyebrow">Referencia de la curva</span><h2 id="guia-recursos-titulo">Referencia para el día actual</h2>
        {puntoActual?.estado === 'calculado' ? <div className="guia-recursos"><p>Consumo acumulado por ave: <strong>{puntoActual.consumoAcumuladoG === null ? 'Dato no disponible' : gramos(puntoActual.consumoAcumuladoG)}</strong></p><p>FCR objetivo: <strong>{puntoActual.fcrObjetivo === null ? 'Dato no disponible' : puntoActual.fcrObjetivo.toFixed(2)}</strong></p></div> : <p>No hay datos de curva para el día actual.</p>}
      </section>
    </div>
  )
}

export default GuiaCrecimientoPage
