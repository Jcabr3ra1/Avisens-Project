import type { ResultadoPrediccion } from '@features/predicciones/api/predicciones'
import { explicarSinProyeccion } from '../model/proyeccion'

type Props = {
  prediccion: ResultadoPrediccion | null
  error: string
  cargando: boolean
}

const entero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
const dosDecimales = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const unDecimal = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

function ProyeccionFaena({ prediccion, error, cargando }: Props) {
  return (
    <section className="adm-panel guia-panel guia-datos-panel gpf" aria-labelledby="gpf-titulo">
      <div>
        <span className="adm-eyebrow">Proyección al día de faena</span>
        <h2 id="gpf-titulo">Cómo cierra el ciclo</h2>
      </div>
      {cargando ? <p className="guia-cargando" role="status">Proyectando el cierre del ciclo…</p> : prediccion === null ? (
        <p className="guia-nota">{error ? explicarSinProyeccion(error) : 'Todavía no hay datos para proyectar el cierre del ciclo.'}</p>
      ) : prediccion.mortalidad_proyectada_pct === null && prediccion.consumo_proyectado_kg === null ? (
        <p className="guia-nota">
          El peso ya se proyecta con los pesajes. Para estimar la mortalidad, el alimento y la conversión al día {prediccion.dia_faena}, registra la mortalidad y el consumo diario en la Bitácora durante al menos 3 días.
        </p>
      ) : (
        <>
          <div className="guia-datos-grid gpf-grid">
            <div>
              <span>Mortalidad al cierre</span>
              <strong>{prediccion.mortalidad_proyectada_pct === null ? '—' : `${unDecimal.format(prediccion.mortalidad_proyectada_pct)} %`}</strong>
            </div>
            <div>
              <span>Alimento del ciclo</span>
              <strong>{prediccion.consumo_proyectado_kg === null ? '—' : `${entero.format(prediccion.consumo_proyectado_kg)} kg`}</strong>
            </div>
            <div>
              <span>Conversión (FCR)</span>
              <strong>{prediccion.fcr_proyectado === null ? '—' : dosDecimales.format(prediccion.fcr_proyectado)}</strong>
            </div>
            <div>
              <span>Día de faena</span>
              <strong>{prediccion.dia_faena}</strong>
            </div>
          </div>
          <p className="guia-nota">
            Estimado con los registros de mortalidad y consumo de la bitácora. Un FCR más bajo es mejor: menos alimento por cada kilo de pollo.
          </p>
        </>
      )}
    </section>
  )
}

export default ProyeccionFaena
