import { lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import type { CurvaCrecimiento } from '@features/predicciones/api/predicciones'
import { formatearFechaCalendario } from '@shared/utils/fechas'
import { IcArrowDown, IcArrowUp, IcCheck, IcScale } from '@shared/ui/icons/icons'
import {
  estandarDelDia, formatearPeso, porcentaje, resumenAccesible, textoDesvio, tonoDesvio,
  type ProblemaCurva,
} from '../model/proyeccion'

const GraficoCrecimiento = lazy(() => import('@shared/ui/graficos/GraficoCrecimiento'))

type Props = {
  loteId: number
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

function PanelCrecimiento({
  loteId, curva, problema, cargando, onReintentar,
}: Props) {
  const referencia = curva?.referencias.genetica?.linea ?? null
  const marca = curva?.referencias.marca?.marca ?? null
  const ultimo = curva?.resumen.ultimo_pesaje
  const esperadoAlPesaje = curva && ultimo ? estandarDelDia(curva, ultimo.dia) : null
  const finalSerie = curva?.serie[curva.serie.length - 1]

  return (
    <section className="adm-panel gcr" aria-labelledby="gcr-titulo">
      <header className="gcr-cabecera">
        <div>
          <span className="adm-eyebrow">Modelo de crecimiento</span>
          <h2 id="gcr-titulo">Hacia dónde va tu lote</h2>
          <p className="gcr-subtitulo">
            {curva
              ? `Pesajes reales y proyección hasta el día ${curva.dia_final}${referencia ? `, comparados con la curva ${referencia}` : ''}.`
              : 'Pesajes reales, proyección hasta el día de salida y la curva estándar de su línea genética.'}
          </p>
        </div>
        <div className="gcr-cabecera-acciones">
          {curva && (
            <span className="gcr-confianza" title="Qué tan angosta es la banda al día de salida">
              Confianza <strong>{porcentaje(curva.modelo.confianza)}</strong>
            </span>
          )}
        </div>
      </header>

      {cargando ? <Esqueleto texto="Calculando la curva del lote…" /> : problema?.tipo === 'sin_pesajes' ? (
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

              <div className="gcr-kpi gcr-kpi--destacado">
                <dt>Proyección al día {curva.dia_final}</dt>
                <dd className="gcr-kpi-valor">{formatearPeso(curva.resumen.peso_final_g)}</dd>
                <dd className="gcr-kpi-detalle">Rango probable {formatearPeso(finalSerie.min_g)} – {formatearPeso(finalSerie.max_g)}</dd>
              </div>

              <Llegada curva={curva} />
            </dl>
          </div>
          {!referencia && (
            <p className="guia-aviso">
              Este lote no tiene línea genética asignada. La proyección usa una curva típica de pollo de engorde y no se compara contra un estándar.
            </p>
          )}
          <p className="gcr-nota">
            Proyección calculada con {curva.modelo.puntos_usados} {curva.modelo.puntos_usados === 1 ? 'pesaje registrado' : 'pesajes registrados'} {referencia ? `y la curva de referencia ${referencia}` : 'y el estándar de crecimiento'}.
            La franja sombreada indica el rango de peso esperado (90 % de probabilidad) y se hace más precisa con cada pesaje.
          </p>
        </>
      ) : null}
    </section>
  )
}

export default PanelCrecimiento
