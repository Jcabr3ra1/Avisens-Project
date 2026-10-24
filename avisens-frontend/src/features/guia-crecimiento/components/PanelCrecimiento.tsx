import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import * as Tabs from '@radix-ui/react-tabs'
import { motion, useReducedMotion } from 'motion/react'
import type { CurvaCrecimiento } from '@features/predicciones/api/predicciones'
import type { Lote } from '@features/lotes/api/lotes'
import { formatearFechaCalendario } from '@shared/utils/fechas'
import { IcArrowDown, IcArrowUp, IcCheck, IcScale } from '@shared/ui/icons/icons'
import GraficoMetrica, { type TipoGraficaGuia } from './GraficoMetrica'
import type { IndicadorLote, PuntoCurvaGenetica } from '../api/guiaCrecimiento'
import {
  estandarDelDia, formatearPeso, porcentaje, resumenAccesible, textoDesvio, tonoDesvio,
  type ProblemaCurva,
} from '../model/proyeccion'

const GraficoCrecimiento = lazy(() => import('@shared/ui/graficos/GraficoCrecimiento'))

type Props = {
  loteId: number
  lote: Lote
  indicadores: IndicadorLote[]
  curvaGenetica: PuntoCurvaGenetica[]
  curva: CurvaCrecimiento | null
  problema: ProblemaCurva | null
  cargando: boolean
  onReintentar: () => void
}

function Esqueleto({ texto }: { texto: string }) {
  return (
    <div className="gcr-esqueleto" role="status">
      <span className="gcr-esqueleto-barra" />
      <span>{texto}</span>
    </div>
  )
}

function ChipDesvio({ pct, referencia }: { pct: number; referencia: string }) {
  const tono = tonoDesvio(pct)
  const Icono = tono === 'bajo' ? IcArrowDown : tono === 'alto' ? IcArrowUp : IcCheck
  return (
    <span className={`gcr-chip gcr-chip--${tono}`}>
      <Icono size={14} aria-hidden="true" />
      {textoDesvio(pct, referencia)}
    </span>
  )
}

function ConteoValor({ valor, formatear }: { valor: number | null; formatear: (valor: number) => string }) {
  const reducir = useReducedMotion()
  const [actual, setActual] = useState(valor ?? 0)
  const valorActual = useRef(valor ?? 0)
  useEffect(() => {
    if (valor === null || reducir) {
      valorActual.current = valor ?? 0
      setActual(valor ?? 0)
      return
    }
    const inicio = performance.now()
    const anterior = valorActual.current
    let marco = 0
    const actualizar = (ahora: number) => {
      const avance = Math.min((ahora - inicio) / 280, 1)
      const suave = 1 - (1 - avance) ** 3
      const siguiente = anterior + (valor - anterior) * suave
      valorActual.current = siguiente
      setActual(siguiente)
      if (avance < 1) marco = requestAnimationFrame(actualizar)
    }
    marco = requestAnimationFrame(actualizar)
    return () => cancelAnimationFrame(marco)
  }, [valor, reducir])
  return <span>{valor === null ? '—' : formatear(actual)}</span>
}

function Llegada({ curva }: { curva: CurvaCrecimiento }) {
  const { peso_objetivo_g: objetivo, dia_final: diaFinal } = curva
  const { dia_al_objetivo: dia, fecha_al_objetivo: fecha } = curva.resumen
  if (objetivo === null) {
    return (
      <div className="gcr-kpi">
        <dt>Peso objetivo</dt>
        <dd className="gcr-kpi-valor gcr-kpi-valor--tenue">Sin definir</dd>
        <dd className="gcr-kpi-detalle">Fíjalo en la meta de crecimiento para saber cuándo llega.</dd>
      </div>
    )
  }
  if (dia === null) {
    return (
      <div className="gcr-kpi">
        <dt>Llega a {formatearPeso(objetivo)}</dt>
        <dd className="gcr-kpi-valor gcr-kpi-valor--tenue">No lo alcanza</dd>
        <dd className="gcr-kpi-detalle">Con este ritmo, el lote no llega a ese peso.</dd>
      </div>
    )
  }
  const diaRedondo = Math.ceil(dia)
  return (
    <div className="gcr-kpi">
      <dt>Llega a {formatearPeso(objetivo)}</dt>
      <dd className="gcr-kpi-valor">Día {diaRedondo}</dd>
      <dd className="gcr-kpi-detalle">
        {formatearFechaCalendario(fecha)}
        {diaRedondo > diaFinal ? ` · después del día de salida (${diaFinal})` : ''}
      </dd>
    </div>
  )
}

function PanelCrecimiento({ loteId, lote, indicadores, curvaGenetica, curva, problema, cargando, onReintentar }: Props) {
  const [pestana, setPestana] = useState<TipoGraficaGuia>('peso')
  const [diaSeleccionado, setDiaSeleccionado] = useState(1)
  const reducir = useReducedMotion()
  const referencia = curva?.referencias.genetica?.linea ?? null
  const marca = curva?.referencias.marca?.marca ?? null
  const ultimo = curva?.resumen.ultimo_pesaje
  const esperadoAlPesaje = curva && ultimo ? estandarDelDia(curva, ultimo.dia) : null
  const finalSerie = curva?.serie[curva.serie.length - 1]
  const suficiente = (curva?.modelo.puntos_usados ?? 0) >= 3
  const primerDia = curva?.serie[0]?.dia ?? 1
  const puntoSeleccionado = curva?.serie.find((punto) => punto.dia === diaSeleccionado) ?? null
  const frase = !curva
    ? 'Registra al menos tres pesajes para ver cómo avanza el lote frente a la curva.'
    : !suficiente
      ? `Hay ${curva.modelo.puntos_usados} ${curva.modelo.puntos_usados === 1 ? 'pesaje' : 'pesajes'}; registra ${3 - curva.modelo.puntos_usados} más para mostrar la tendencia.`
      : curva.resumen.desvio_vs_estandar_pct === null
        ? `Con los pesajes registrados, el lote llegaría a ${formatearPeso(curva.resumen.peso_final_g)} el día ${curva.dia_final}.`
        : `Tu lote va ${Math.abs(curva.resumen.desvio_vs_estandar_pct).toLocaleString('es-CO', { maximumFractionDigits: 1 })} % ${curva.resumen.desvio_vs_estandar_pct < 0 ? 'por debajo' : 'por encima'} de la curva${curva.resumen.dia_al_objetivo !== null ? `; llegaría a ${formatearPeso(curva.peso_objetivo_g)} el día ${Math.ceil(curva.resumen.dia_al_objetivo)}` : `; cerraría en ${formatearPeso(curva.resumen.peso_final_g)} el día ${curva.dia_final}`}.`

  useEffect(() => {
    if (curva) setDiaSeleccionado(Math.max(curva.serie[0]?.dia ?? 1, Math.min(curva.dia_actual, curva.dia_final)))
  }, [curva])

  function animarContenido(contenido: ReactNode) {
    return (
      <motion.div
        initial={reducir ? false : { opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reducir ? 0 : 0.18, ease: [0.2, 0, 0, 1] }}
      >
        {contenido}
      </motion.div>
    )
  }

  return (
    <section className="gcr" aria-labelledby="gcr-titulo">
      <header className="gcr-cabecera">
        <div>
          <h2 id="gcr-titulo">Así va tu lote</h2>
          <p className="gcr-subtitulo" aria-live="polite">{frase}</p>
        </div>
        <div className="gcr-cabecera-acciones">
          {curva && suficiente && <span className="gcr-confianza" title="Confianza de la proyección">
            Confianza <strong>{porcentaje(curva.modelo.confianza)}</strong>
          </span>}
        </div>
      </header>

      <Tabs.Root value={pestana} onValueChange={(valor) => setPestana(valor as TipoGraficaGuia)}>
        <Tabs.List className="gcr-pestanas" aria-label="Métrica de crecimiento">
          {([
            ['peso', 'Peso'], ['consumo', 'Consumo'], ['mortalidad', 'Mortalidad'], ['fcr', 'FCR'], ['ambiente', 'Ambiente'],
          ] as Array<[TipoGraficaGuia, string]>).map(([valor, etiqueta]) => (
            <Tabs.Trigger key={valor} value={valor} className="gcr-pestana">
              {etiqueta}
              {pestana === valor && <motion.span aria-hidden="true" className="gcr-indicador-pestana" layoutId="gcr-indicador" transition={{ duration: reducir ? 0 : 0.18 }} />}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="peso" className="gcr-contenido">
          {animarContenido(cargando ? <Esqueleto texto="Calculando la curva del lote…" /> : problema?.tipo === 'sin_pesajes' ? (
        <div className="gcr-vacio">
          <div className="gcr-vacio-icono" aria-hidden="true">
            <IcScale size={36} />
          </div>
          <strong>Tu lote aún no tiene pesajes registrados</strong>
          <p>
            Al registrar el primer pesaje en la bitácora, calcularemos automáticamente la curva de crecimiento,
            la comparación con el estándar de su raza y la fecha estimada de salida.
          </p>
          <div className="gcr-vacio-accion">
            <Link className="adm-btn adm-btn--primario" to={`/bitacora?lote=${loteId}&vista=peso`}>
              + Registrar primer pesaje en Bitácora
            </Link>
          </div>
        </div>
      ) : problema?.tipo === 'error' ? (
        <div className="guia-error" role="alert">
          <span>{problema.mensaje}</span>
          {/bit[aá]cora/i.test(problema.mensaje) ? (
            <Link className="adm-btn adm-btn--primario" to={`/bitacora?lote=${loteId}&vista=peso`}>Corregir en la Bitácora</Link>
          ) : (
            <button type="button" className="adm-btn adm-btn--secundario" onClick={onReintentar}>Reintentar</button>
          )}
        </div>
      ) : curva && ultimo && finalSerie ? (
        <>
          <div className="gcr-cuerpo">
            <div className="gcr-grafico">
              <Suspense fallback={<Esqueleto texto="Cargando gráfico…" />}>
                <GraficoCrecimiento
                  serie={curva.serie}
                  diaActual={curva.dia_actual}
                  pesoObjetivoG={curva.peso_objetivo_g}
                  etiquetaEstandar={referencia}
                  etiquetaMarca={marca ? `Curva ${marca}` : null}
                  descripcion={resumenAccesible(curva, referencia)}
                  diaSeleccionado={diaSeleccionado}
                  mostrarProyeccion={suficiente}
                />
              </Suspense>
            </div>
            <dl className="gcr-kpis">
              <div className="gcr-kpi">
                <dt>Último pesaje · día {ultimo.dia}</dt>
                <dd className="gcr-kpi-valor">{formatearPeso(ultimo.peso_g)}</dd>
                {referencia && curva.resumen.desvio_vs_estandar_pct !== null ? (
                  <dd><ChipDesvio pct={curva.resumen.desvio_vs_estandar_pct} referencia={referencia} /></dd>
                ) : null}
                {esperadoAlPesaje !== null && <dd className="gcr-kpi-detalle">Esperado ese día: {formatearPeso(esperadoAlPesaje)}</dd>}
              </div>

              {suficiente && <div className="gcr-kpi gcr-kpi--destacado">
                <dt>Proyección al día {curva.dia_final}</dt>
                <dd className="gcr-kpi-valor"><ConteoValor valor={curva.resumen.peso_final_g} formatear={formatearPeso} /></dd>
                <dd className="gcr-kpi-detalle">Rango probable {formatearPeso(finalSerie.min_g)} – {formatearPeso(finalSerie.max_g)}</dd>
              </div>}

              {suficiente && <Llegada curva={curva} />}
            </dl>
          </div>
          {!suficiente && <p className="gcr-aviso-datos">Las proyecciones aparecen después de registrar tres pesajes en días distintos.</p>}
          {!referencia && (
            <p className="guia-aviso">
              Este lote no tiene línea genética asignada. La proyección usa una curva típica de pollo de engorde y no se compara contra un estándar.
            </p>
          )}
          {suficiente && <p className="gcr-nota">
            Proyección calculada con {curva.modelo.puntos_usados} pesajes {referencia ? `y la curva de referencia ${referencia}` : 'y el estándar de crecimiento'}. La franja sombreada indica el rango de peso esperado.
          </p>}
          <div className="gcr-dia-control">
            <label htmlFor="gcr-dia">Explora el día {diaSeleccionado}</label>
            <input id="gcr-dia" type="range" min={primerDia} max={curva.dia_final} step="1" value={diaSeleccionado}
              onChange={(evento) => setDiaSeleccionado(Number(evento.target.value))}
              aria-valuetext={`Día ${diaSeleccionado}`} />
            <dl className="gcr-dia-valores" aria-live="polite">
              <div><dt>Pesaje real</dt><dd><ConteoValor valor={puntoSeleccionado?.real_g ?? null} formatear={formatearPeso} /></dd></div>
              <div><dt>Proyectado</dt><dd><ConteoValor valor={suficiente ? puntoSeleccionado?.proyectado_g ?? null : null} formatear={formatearPeso} /></dd></div>
              <div><dt>Curva estándar</dt><dd><ConteoValor valor={puntoSeleccionado?.estandar_g ?? null} formatear={formatearPeso} /></dd></div>
            </dl>
          </div>
        </>
      ) : null)}
        </Tabs.Content>
        {(['consumo', 'mortalidad', 'fcr', 'ambiente'] as const).map((tipo) => (
          <Tabs.Content key={tipo} value={tipo} className="gcr-contenido">
            {animarContenido(<GraficoMetrica tipo={tipo} lote={lote} indicadores={indicadores} curvaGenetica={curvaGenetica} diaActual={Math.max(1, curva?.dia_actual ?? 1)} />)}
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </section>
  )
}

export default PanelCrecimiento
