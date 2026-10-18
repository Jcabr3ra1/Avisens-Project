import { motion } from 'motion/react'
import type { RiesgoCalor } from '@features/predicciones/api/predicciones'
import {
  ETIQUETA_NIVEL, escalaThi, esPollito, etiquetaHoraLarga, franjasCalor, posicionEnEscala, titularRiesgo,
  type ProblemaRiesgo,
} from '@features/predicciones/model/riesgoCalor'
import type { SensorVista } from '@features/monitoreo/hooks/useMonitoreoAmbiental'
import { IcRefresh } from '@shared/ui/icons/icons'
import { hace } from '@shared/utils/fechas'

type Props = {
  riesgo: RiesgoCalor | null
  problema: ProblemaRiesgo | null
  cargando: boolean
  sensores: SensorVista[]
  onCompletarUbicacion?: () => void
  onReintentar: () => void
}

const decimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })
const HORA_MS = 60 * 60 * 1000

function lecturaDe(sensores: SensorVista[], patron: RegExp) {
  return sensores.find((sensor) => patron.test(sensor.tipo) && sensor.valor !== null) ?? null
}

function Medida({ rotulo, temperatura, humedad, nota }: {
  rotulo: string
  temperatura: number | null
  humedad: number | null
  nota: string
}) {
  return (
    <div className="amb-medida">
      <span className="amb-rotulo">{rotulo}</span>
      <span className="amb-medida-temp">
        {temperatura === null ? '—' : decimal.format(temperatura)}
        <small>°C</small>
      </span>
      <span className="amb-medida-hum">{humedad === null ? 'Sin humedad' : `${decimal.format(humedad)} % de humedad`}</span>
      <span className="amb-medida-nota">{nota}</span>
    </div>
  )
}

function Termometro({ riesgo }: { riesgo: RiesgoCalor }) {
  const franjas = franjasCalor(riesgo.lote?.dia_vida)
  const escala = escalaThi(franjas)
  const ahora = riesgo.serie[0]
  const posicionAhora = posicionEnEscala(ahora.thi, escala)
  const posicionPico = posicionEnEscala(riesgo.pico.thi, escala)
  const anclaje = (posicion: number) => (posicion < 12 ? ' is-inicio' : posicion > 88 ? ' is-final' : '')
  const marcas = franjas.filter((franja, i) => i === 0 || franja.desde - franjas[i - 1].desde >= 3)
  const tramos = [
    { nivel: 'confort', desde: escala.minimo, hasta: franjas[0].desde },
    ...franjas.map((franja) => ({ nivel: franja.nivel, desde: franja.desde, hasta: franja.hasta ?? escala.maximo })),
  ]

  return (
    <div className="amb-termo" role="img" aria-label={`Índice de calor ahora ${decimal.format(ahora.thi)}, nivel ${ETIQUETA_NIVEL[ahora.nivel]}. Pico de las próximas 72 horas ${decimal.format(riesgo.pico.thi)}.`}>
      <div className="amb-termo-barra">
        {tramos.map((tramo) => (
          <span
            key={tramo.nivel}
            className={`amb-termo-tramo amb-termo-tramo--${tramo.nivel}`}
            style={{ flexGrow: tramo.hasta - tramo.desde }}
          />
        ))}
        <motion.span
          className={`amb-termo-pico${anclaje(posicionPico)}`}
          initial={{ left: '0%', opacity: 0 }}
          animate={{ left: `${posicionPico}%`, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 90, damping: 18, delay: 0.25 }}
        >
          <span>Pico {decimal.format(riesgo.pico.thi)}</span>
        </motion.span>
        <motion.span
          className={`amb-termo-ahora${anclaje(posicionAhora)}`}
          initial={{ left: '0%' }}
          animate={{ left: `${posicionAhora}%` }}
          transition={{ type: 'spring', stiffness: 110, damping: 16 }}
        >
          <span>Ahora {decimal.format(ahora.thi)}</span>
        </motion.span>
      </div>
      <div className="amb-termo-escala" aria-hidden="true">
        {marcas.map((franja, i) => (
          <span key={franja.nivel} style={{ left: `${posicionEnEscala(franja.desde, escala)}%` }}>
            {i === 0 ? `Riesgo desde ${franja.desde}` : franja.desde}
          </span>
        ))}
      </div>
    </div>
  )
}

function AhoraGalpon({ riesgo, problema, cargando, sensores, onCompletarUbicacion, onReintentar }: Props) {
  const temperatura = lecturaDe(sensores, /temp/i)
  const humedad = lecturaDe(sensores, /hum/i)
  const ultima = temperatura?.ultimaLecturaTs ?? humedad?.ultimaLecturaTs ?? null
  const reciente = ultima !== null && Date.now() - ultima < HORA_MS
  const notaAdentro = sensores.length === 0
    ? 'Sin sensores instalados'
    : ultima === null ? 'Tus sensores aún no reportan' : `${reciente ? 'Lectura' : 'Última lectura'} ${hace(new Date(ultima).toISOString())}`

  if (cargando) {
    return <div className="amb-ahora amb-ahora--cargando" aria-busy="true"><span>Consultando el pronóstico del clima…</span></div>
  }

  if (!riesgo) {
    return (
      <section className="amb-ahora amb-ahora--aviso" aria-label="Clima del galpón">
        <div className="amb-ahora-aviso">
          <span className="amb-rotulo">Clima del galpón</span>
          {problema?.tipo === 'sin_ubicacion' ? (
            <>
              <h3>Ubica tu granja para anticipar el calor</h3>
              <p>Con el municipio traemos el pronóstico de las próximas 72 horas y te avisamos antes de que el calor afecte a tus aves.</p>
              {onCompletarUbicacion && (
                <button type="button" className="amb-boton" onClick={onCompletarUbicacion}>Completar municipio</button>
              )}
            </>
          ) : (
            <>
              <h3>No pudimos traer el pronóstico</h3>
              <p>{problema?.mensaje}</p>
              <button type="button" className="amb-boton" onClick={onReintentar}>
                <IcRefresh size={15} aria-hidden="true" /> Reintentar
              </button>
            </>
          )}
        </div>
        <Medida rotulo="Adentro" temperatura={temperatura?.valor ?? null} humedad={humedad?.valor ?? null} nota={notaAdentro} />
      </section>
    )
  }

  const ahora = riesgo.serie[0]
  const afuera = {
    temperatura: ahora.temperatura - riesgo.ajuste_aplicado.temperatura,
    humedad: ahora.humedad - riesgo.ajuste_aplicado.humedad,
  }

  return (
    <motion.section
      className={`amb-ahora amb-ahora--${riesgo.nivel_maximo}`}
      aria-labelledby="amb-ahora-titulo"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
    >
      <div className="amb-ahora-principal">
        <span className="amb-rotulo">Ahora en el galpón</span>
        <h3 id="amb-ahora-titulo" className="amb-ahora-titular">{titularRiesgo(riesgo)}</h3>
        <div className="amb-ahora-medidas">
          <Medida rotulo="Adentro" temperatura={temperatura?.valor ?? null} humedad={humedad?.valor ?? null} nota={notaAdentro} />
          <span className="amb-ahora-separador" aria-hidden="true" />
          <Medida
            rotulo="Afuera"
            temperatura={afuera.temperatura}
            humedad={afuera.humedad}
            nota={`Pronóstico ${riesgo.ubicacion.origen === 'municipio' ? 'del municipio' : 'de la granja'}`}
          />
        </div>
        <Termometro riesgo={riesgo} />
      </div>

      <aside className="amb-ahora-consejos" aria-label="Qué hacer">
        <span className="amb-rotulo">Qué hacer</span>
        <ul>
          {riesgo.recomendaciones.map((consejo, indice) => (
            <motion.li
              key={consejo}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + indice * 0.06 }}
            >
              {consejo}
            </motion.li>
          ))}
        </ul>
        <dl className="amb-ahora-datos">
          <div>
            <dt>Pico</dt>
            <dd>{etiquetaHoraLarga(riesgo.pico.hora)}</dd>
          </div>
          <div>
            <dt>Aves</dt>
            <dd>
              {riesgo.lote
                ? `${esPollito(riesgo.lote.dia_vida) ? 'Pollitos' : 'Lote'} de ${riesgo.lote.dia_vida} días`
                : 'Galpón sin lote'}
            </dd>
          </div>
          <div>
            <dt>Confianza</dt>
            <dd>{Math.round(riesgo.modelo.confianza * 100)} %</dd>
          </div>
        </dl>
      </aside>
    </motion.section>
  )
}

export default AhoraGalpon
