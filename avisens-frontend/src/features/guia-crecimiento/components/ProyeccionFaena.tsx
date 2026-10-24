import { useEffect, useState } from 'react'
import type { CurvaCrecimiento, ResultadoPrediccion } from '@features/predicciones/api/predicciones'
import { simularFaena } from '@features/predicciones/api/predicciones'
import type { PlanLoteGuia } from '../api/guiaCrecimiento'
import { mensajeDeError } from '@shared/utils/errores'
import { formatearPeso, explicarSinProyeccion } from '../model/proyeccion'

type Props = {
  loteId: number
  curva: CurvaCrecimiento | null
  plan: PlanLoteGuia | null
  prediccion: ResultadoPrediccion | null
  error: string
  cargando: boolean
}

const entero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
const dosDecimales = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const unDecimal = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

function ProyeccionFaena({ loteId, curva, plan, prediccion, error, cargando }: Props) {
  const minDia = Math.max(1, (curva?.resumen.ultimo_pesaje.dia ?? 0) + 1)
  const diaPlan = plan?.resultado.dia_objetivo ?? prediccion?.dia_faena ?? minDia
  const [dia, setDia] = useState(minDia)
  const [simulacion, setSimulacion] = useState<ResultadoPrediccion | null>(null)
  const [errorSimulacion, setErrorSimulacion] = useState('')
  const [cargandoSimulacion, setCargandoSimulacion] = useState(false)
  const planListo = plan !== null && !plan.desactualizado && plan.estado_dia === 'calculado'
  const datosSuficientes = (curva?.modelo.puntos_usados ?? 0) >= 3
  const quedanDiasSimulables = minDia <= 100

  useEffect(() => {
    setDia(Math.max(minDia, Math.min(100, diaPlan)))
    setSimulacion(null)
    setErrorSimulacion('')
  }, [loteId, minDia, diaPlan])

  const resultado = simulacion?.dia_faena === dia
    ? simulacion
    : prediccion?.dia_faena === dia ? prediccion : null

  async function ejecutarSimulacion() {
    if (!planListo || !datosSuficientes || resultado) return
    setCargandoSimulacion(true)
    setErrorSimulacion('')
    try {
      setSimulacion(await simularFaena(loteId, dia))
    } catch (fallo) {
      setErrorSimulacion(mensajeDeError(fallo, 'No se pudo simular ese día de salida.'))
    } finally {
      setCargandoSimulacion(false)
    }
  }

  return (
    <section className="adm-panel guia-panel guia-datos-panel gpf" aria-labelledby="gpf-titulo">
      <div>
        <span className="adm-eyebrow">Simulador de salida</span>
        <h2 id="gpf-titulo">¿Y si faeno el día {dia}?</h2>
        <p className="guia-meta-subtitulo">Elige un día futuro para estimar el peso y la conversión del lote.</p>
      </div>
      {!planListo ? (
        <p className="guia-nota">{plan?.desactualizado
          ? 'Recalcula el plan del lote para habilitar la simulación.'
          : 'Define una meta de peso con un día de salida válido para habilitar la simulación.'}</p>
      ) : !datosSuficientes ? (
        <p className="guia-nota">Se necesitan pesajes de al menos tres días distintos para simular la salida.</p>
      ) : !quedanDiasSimulables ? (
        <p className="guia-nota">El último pesaje ya está en el día máximo que aceptan las proyecciones.</p>
      ) : (
        <>
          <div className="gpf-control">
            <label htmlFor="gpf-dia">Día de faena: <strong>{dia}</strong></label>
            <input
              id="gpf-dia"
              type="range"
              min={minDia}
              max={100}
              step="1"
              value={dia}
              aria-valuetext={`Día ${dia}`}
              disabled={cargando || cargandoSimulacion}
              onChange={(evento) => {
                setDia(Number(evento.target.value))
                setSimulacion(null)
                setErrorSimulacion('')
              }}
            />
            <span className="gpf-rango-ayuda">Día {minDia} · Día 100</span>
            <button
              type="button"
              className="adm-btn adm-btn--primario"
              onClick={() => void ejecutarSimulacion()}
              disabled={cargando || cargandoSimulacion || resultado !== null}
            >
              {cargandoSimulacion ? 'Calculando…' : resultado ? 'Simulación lista' : 'Simular este día'}
            </button>
          </div>
          {errorSimulacion ? (
            <p className="guia-error" role="alert">{errorSimulacion}</p>
          ) : resultado ? (
            <>
              <div className="guia-datos-grid gpf-grid">
                <div><span>Peso estimado al día {resultado.dia_faena}</span><strong>{formatearPeso(resultado.peso_proyectado_faena_g)}</strong></div>
                <div><span>FCR estimado</span><strong>{resultado.fcr_proyectado === null ? '—' : dosDecimales.format(resultado.fcr_proyectado)}</strong></div>
                <div><span>Mortalidad estimada</span><strong>{resultado.mortalidad_proyectada_pct === null ? '—' : `${unDecimal.format(resultado.mortalidad_proyectada_pct)} %`}</strong></div>
                <div><span>Alimento total estimado</span><strong>{resultado.consumo_proyectado_kg === null ? '—' : `${entero.format(resultado.consumo_proyectado_kg)} kg`}</strong></div>
              </div>
              {resultado.fcr_proyectado === null && <p className="guia-nota">El peso sí se estima; faltan registros de consumo o mortalidad suficientes para calcular el FCR.</p>}
              <p className="guia-nota">La simulación usa los modelos de predicción existentes y no modifica el plan ni guarda un nuevo pronóstico.</p>
            </>
          ) : (
            <p className="guia-nota">{cargando
              ? 'Cargando la proyección del plan…'
              : error ? explicarSinProyeccion(error) : 'Mueve el control y simula otro día para comparar el cierre del lote.'}</p>
          )}
        </>
      )}
    </section>
  )
}

export default ProyeccionFaena
