import { useRiesgoCalor } from '@features/granjas/propietario/useRiesgoCalor'
import type { NivelCalor } from '@features/predicciones/api/predicciones'
import { ETIQUETA_NIVEL, etiquetaHoraLarga, titularRiesgo } from '@features/predicciones/model/riesgoCalor'

const TONO: Record<NivelCalor, string> = {
  confort: 'ok',
  atencion: 'atencion',
  alerta: 'atencion',
  peligro: 'critico',
  emergencia: 'critico',
}

const decimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })

function RiesgoCalorResumen({ galponId }: { galponId: number }) {
  const { riesgo, problema, cargando } = useRiesgoCalor(galponId, 0)

  return (
    <section className="rsm-calor" aria-labelledby="resumen-calor-titulo" aria-busy={cargando}>
      <header className="rsm-calor-cabecera">
        <h2 id="resumen-calor-titulo" className="rsm-titulo">Calor en las próximas 72 horas</h2>
        {riesgo && (
          <span className={`rsm-estado rsm-estado--${TONO[riesgo.nivel_maximo]}`}>{ETIQUETA_NIVEL[riesgo.nivel_maximo]}</span>
        )}
      </header>

      {cargando ? (
        <p className="rsm-calor-texto" role="status">Calculando el riesgo…</p>
      ) : problema ? (
        <p className="rsm-calor-texto">
          {problema.tipo === 'sin_ubicacion'
            ? 'Falta la ubicación de la granja para calcular el calor.'
            : 'No se pudo calcular el riesgo de calor ahora.'}
        </p>
      ) : riesgo ? (
        <>
          <p className="rsm-calor-titular">{titularRiesgo(riesgo)}</p>
          {riesgo.nivel_maximo !== 'confort' && (
            <p className="rsm-calor-texto">
              Pico el {etiquetaHoraLarga(riesgo.pico.hora)}: {decimal.format(riesgo.pico.temperatura)} °C y{' '}
              {decimal.format(riesgo.pico.humedad)} % de humedad.
              {riesgo.recomendaciones[0] && <> {riesgo.recomendaciones[0]}</>}
            </p>
          )}
        </>
      ) : null}
    </section>
  )
}

export default RiesgoCalorResumen
