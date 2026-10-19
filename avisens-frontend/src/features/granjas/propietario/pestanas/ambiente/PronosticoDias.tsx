import { motion } from 'motion/react'
import type { RiesgoCalor } from '@features/predicciones/api/predicciones'
import {
  ETIQUETA_NIVEL, diasDelPronostico, etiquetaHoraLarga, franjasCalor, intensidadConfort,
} from '@features/predicciones/model/riesgoCalor'

const decimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })
const entero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })

function PronosticoDias({ riesgo }: { riesgo: RiesgoCalor }) {
  const franjas = franjasCalor(riesgo.lote?.dia_vida)
  const dias = diasDelPronostico(riesgo.serie)

  return (
    <section className="amb-dias" aria-label="Pronóstico por día">
      {dias.map((dia, indice) => (
        <motion.article
          key={dia.fecha}
          className={`amb-dia amb-dia--${dia.pico.nivel}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 * indice, duration: 0.3, ease: [0.2, 0, 0, 1] }}
        >
          <header className="amb-dia-cabecera">
            <h4>{dia.etiqueta}</h4>
            <span className={`amb-nivel amb-nivel--${dia.pico.nivel}`}>{ETIQUETA_NIVEL[dia.pico.nivel]}</span>
          </header>
          <div className="amb-dia-cifra">
            <span className="amb-dia-thi">{decimal.format(dia.pico.thi)}</span>
            <span className="amb-dia-thi-rotulo">THI máximo</span>
          </div>
          <p className="amb-dia-temps">
            <span>Máx <b>{entero.format(dia.temperaturaMaxima)}°</b></span>
            <span>Mín <b>{entero.format(dia.temperaturaMinima)}°</b></span>
          </p>
          <div className="amb-cinta" role="img" aria-label={`Hora más calurosa: ${etiquetaHoraLarga(dia.pico.hora)}`}>
            {dia.horas.map((hora, h) => (
              <span
                key={h}
                className={`amb-cinta-hora${hora ? ` amb-cinta-hora--${hora.nivel}` : ' is-vacia'}${hora === dia.pico ? ' is-pico' : ''}`}
                style={hora ? {
                  height: `${28 + intensidadConfort(hora.thi, franjas) * 72}%`,
                  opacity: hora.nivel === 'confort' ? 0.35 + intensidadConfort(hora.thi, franjas) * 0.65 : 1,
                  animationDelay: `${h * 12}ms`,
                } : undefined}
                title={hora ? `${etiquetaHoraLarga(hora.hora)} · THI ${decimal.format(hora.thi)} · ${decimal.format(hora.temperatura)} °C` : undefined}
              />
            ))}
          </div>
          <div className="amb-cinta-marcas" aria-hidden="true">
            <span>12 a. m.</span><span>6 a. m.</span><span>12 p. m.</span><span>6 p. m.</span>
          </div>
        </motion.article>
      ))}
    </section>
  )
}

export default PronosticoDias
