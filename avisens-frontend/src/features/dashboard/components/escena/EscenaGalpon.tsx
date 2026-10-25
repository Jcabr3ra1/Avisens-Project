import { useId } from 'react'
import type { CSSProperties } from 'react'
import Pollito from '@shared/ui/ilustraciones/Pollito'
import type { TonoGranja } from '../../model/estadoGranja'
import type { KpiGranja } from '../../model/resumenGranja'
import {
  colorDeEdad, escalaDelPollito, estadoDeLampara, etiquetaDeKpi, pollitosVisibles,
  posicionesDePollitos, type ClaseSensor, type PosicionPollito, type SensorEscena,
} from '../../model/escenaGalpon'
import galponImagen from '../../assets/escena/galpon.webp'
import sensorTemperatura from '../../assets/escena/sensores/temperatura.webp'
import sensorHumedad from '../../assets/escena/sensores/humedad.webp'
import sensorCo2 from '../../assets/escena/sensores/co2.webp'
import sensorAmoniaco from '../../assets/escena/sensores/amoniaco.webp'
import sensorLuz from '../../assets/escena/sensores/luz.webp'
import arbol2 from '../../assets/escena/plantas/arbol-2.webp'
import arbol3 from '../../assets/escena/plantas/arbol-3.webp'
import arbol4 from '../../assets/escena/plantas/arbol-4.webp'
import arbol5 from '../../assets/escena/plantas/arbol-5.webp'
import pasto1 from '../../assets/escena/plantas/pasto-1.webp'
import pasto2 from '../../assets/escena/plantas/pasto-2.webp'
import pasto3 from '../../assets/escena/plantas/pasto-3.webp'
import pasto4 from '../../assets/escena/plantas/pasto-4.webp'

type Props = {
  nombreGranja: string
  tono: TonoGranja
  diaLote: number | null
  aves: number
  semilla: number
  sensores: SensorEscena[]
  kpis: KpiGranja[]
  onNavegar: (destino: string) => void
}

const ESCENA = { ancho: 760, alto: 530 }
const GALPON = { x: 145, y: 32, ancho: 470, alto: 434.4 }
const SUELO_Y = 466.4
const PISO = { atrasY: 290, frenteY: 388, atrasIzq: 354, atrasDer: 406, frenteIzq: 248, frenteDer: 514 }
const ESCALA_PINTADA = 1
const LARGO_MAXIMO_LETRERO = 11

type Planta = { url: string; relacion: number; x: number; base: number; medida: number; sobre: 'alto' | 'ancho'; giro: number; retraso: number }

const PLANTAS_TRASERAS: Planta[] = [
  { url: arbol4, relacion: 139 / 420, x: 98, base: 462, medida: 196, sobre: 'alto', giro: 0.9, retraso: -1.1 },
  { url: arbol3, relacion: 245 / 420, x: 40, base: 468, medida: 214, sobre: 'alto', giro: 0.7, retraso: -3.4 },
  { url: arbol5, relacion: 115 / 420, x: 672, base: 462, medida: 268, sobre: 'alto', giro: 0.8, retraso: -2.2 },
  { url: arbol2, relacion: 242 / 420, x: 726, base: 470, medida: 176, sobre: 'alto', giro: 0.7, retraso: -4.6 },
]

const PLANTAS_DELANTERAS: Planta[] = [
  { url: pasto1, relacion: 420 / 325, x: 58, base: 522, medida: 84, sobre: 'ancho', giro: 2.4, retraso: -0.8 },
  { url: pasto3, relacion: 420 / 285, x: 292, base: 508, medida: 54, sobre: 'ancho', giro: 1.8, retraso: -2.6 },
  { url: pasto4, relacion: 420 / 159, x: 628, base: 506, medida: 88, sobre: 'ancho', giro: 1.6, retraso: -1.7 },
  { url: pasto2, relacion: 420 / 268, x: 714, base: 526, medida: 86, sobre: 'ancho', giro: 2.4, retraso: -3.1 },
]

type PuestoSensor = { x: number; y: number; ancho: number; lado: 'izq' | 'der'; url: string; relacion: number }

const PUESTOS: Record<ClaseSensor, PuestoSensor> = {
  temperatura: { x: 559, y: 258, ancho: 26, lado: 'der', url: sensorTemperatura, relacion: 166 / 240 },
  humedad: { x: 559, y: 319, ancho: 33, lado: 'der', url: sensorHumedad, relacion: 204 / 240 },
  co2: { x: 201, y: 258, ancho: 35, lado: 'izq', url: sensorCo2, relacion: 197 / 240 },
  amoniaco: { x: 201, y: 319, ancho: 37, lado: 'izq', url: sensorAmoniaco, relacion: 232 / 240 },
  luz: { x: 380, y: 168, ancho: 46, lado: 'der', url: sensorLuz, relacion: 240 / 233 },
}

const ORIGEN_GUIA_SENSOR = { x: 640, y: 62 }

function sensorMasCercano(sensores: SensorEscena[]): PuestoSensor | null {
  const distancia = (puesto: PuestoSensor) => Math.hypot(puesto.x - ORIGEN_GUIA_SENSOR.x, puesto.y - ORIGEN_GUIA_SENSOR.y)
  return sensores
    .map((sensor) => PUESTOS[sensor.clase])
    .sort((a, b) => distancia(a) - distancia(b))[0] ?? null
}

const decimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })

function letrero(nombre: string): string {
  const limpio = nombre.trim()
  return limpio.length > LARGO_MAXIMO_LETRERO ? `${limpio.slice(0, LARGO_MAXIMO_LETRERO - 1)}…` : limpio
}

function enPiso(pollito: PosicionPollito) {
  const t = pollito.fila
  const mezclar = (a: number, b: number) => a + (b - a) * t
  const izquierda = mezclar(PISO.atrasIzq, PISO.frenteIzq)
  const derecha = mezclar(PISO.atrasDer, PISO.frenteDer)
  const u = pollito.x < 0.5 ? pollito.x * 0.88 : 0.12 + pollito.x * 0.88
  return { x: izquierda + u * (derecha - izquierda), y: mezclar(PISO.atrasY, PISO.frenteY) }
}

const porcentajeX = (x: number) => `${((x / ESCENA.ancho) * 100).toFixed(3)}%`
const porcentajeY = (y: number) => `${((y / ESCENA.alto) * 100).toFixed(3)}%`

function estiloPlanta(planta: Planta): CSSProperties {
  const ancho = planta.sobre === 'alto' ? planta.medida * planta.relacion : planta.medida
  return {
    left: porcentajeX(planta.x),
    top: porcentajeY(planta.base),
    width: porcentajeX(ancho),
    '--giro': `${planta.giro}deg`,
    '--retraso': `${planta.retraso}s`,
  } as CSSProperties
}

function valorDeSensor(sensor: SensorEscena): string {
  return sensor.valor === null ? 'sin lectura' : `${decimal.format(sensor.valor)} ${sensor.unidad}`.trim()
}

function EscenaGalpon({
  nombreGranja, tono, diaLote, aves, semilla, sensores, kpis, onNavegar,
}: Props) {
  const id = useId().replace(/:/g, '')
  const lampara = estadoDeLampara(tono)
  const escala = escalaDelPollito(diaLote)
  const pollitos = posicionesDePollitos(pollitosVisibles(aves), semilla)
  const kpiPorId = new Map(kpis.map((kpi) => [kpi.id, kpi]))
  const temperatura = sensores.find((sensor) => sensor.clase === 'temperatura' && sensor.valor !== null)
  const ambiente = temperatura ? valorDeSensor(temperatura) : null
  const primerSensor = sensorMasCercano(sensores)
  const destinoAmbiente = kpiPorId.get('sensores')?.destino ?? '/granjas'
  const descripcion = aves > 0
    ? `Galpón de ${nombreGranja} con ${aves.toLocaleString('es-CO')} aves${diaLote === null ? '' : ` en el día ${diaLote}`}`
    : `Galpón de ${nombreGranja}, sin aves por ahora`

  return (
    <div
      className={`escena escena--${lampara.color}`}
      style={{ '--edad': colorDeEdad(diaLote) } as CSSProperties}
    >
      <div className="escena-lienzo" role="group" aria-label={descripcion}>
        <svg className="escena-capa escena-suelo" viewBox={`0 0 ${ESCENA.ancho} ${ESCENA.alto}`} aria-hidden="true" overflow="visible">
          <rect x="-1600" y={SUELO_Y} width="4000" height="260" fill="var(--suelo)" />
          <rect x="-1600" y={SUELO_Y} width="4000" height="5" fill="var(--cesped)" />
        </svg>

        <div className="escena-capa escena-capa--trasera" aria-hidden="true">
          {PLANTAS_TRASERAS.map((planta) => (
            <img key={planta.url} className="escena-planta escena-img" src={planta.url} alt="" style={estiloPlanta(planta)} />
          ))}
        </div>

        <img
          className="escena-galpon escena-img"
          src={galponImagen}
          alt=""
          aria-hidden="true"
          style={{
            left: porcentajeX(GALPON.x), top: porcentajeY(GALPON.y),
            width: porcentajeX(GALPON.ancho), height: porcentajeY(GALPON.alto),
          }}
        />
        <span
          className="escena-brillo"
          aria-hidden="true"
          style={{
            left: porcentajeX(GALPON.x), top: porcentajeY(GALPON.y + GALPON.alto * 0.2),
            width: porcentajeX(GALPON.ancho), height: porcentajeY(GALPON.alto * 0.7),
          }}
        />

        <svg className="escena-capa escena-dibujo" viewBox={`0 0 ${ESCENA.ancho} ${ESCENA.alto}`} aria-hidden="true">
          <g>
            {pollitos.map((pollito, indice) => {
              const lugar = enPiso(pollito)
              return (
                <Pollito
                  key={indice}
                  x={lugar.x}
                  y={lugar.y}
                  escala={escala * pollito.perspectiva * ESCALA_PINTADA}
                  mirada={pollito.mirada}
                  retraso={pollito.retraso}
                />
              )
            })}
          </g>

          <g className="escena-guias" fill="none" stroke="var(--hero-texto)" strokeWidth="1.5" strokeLinecap="round">
            <path d="M366 33H336" />
            <path d="M380 486V394" />
            {primerSensor && <path d={`M${ORIGEN_GUIA_SENSOR.x} ${ORIGEN_GUIA_SENSOR.y}L${primerSensor.x + 8} ${primerSensor.y - 12}`} />}
          </g>
          <g fill="var(--hero-texto)">
            <circle cx="372" cy="33" r="3" />
            <circle cx="380" cy="392" r="3" />
            {primerSensor && <circle cx={primerSensor.x + 8} cy={primerSensor.y - 12} r="3" />}
          </g>

          <path d="M380 60V42" stroke="var(--techo-sombra)" strokeWidth="3" strokeLinecap="round" />
          <circle className={lampara.pulsa ? 'escena-halo escena-halo--pulsa' : 'escena-halo'} cx="380" cy="33" r="15" fill="var(--lampara)" />
          <circle cx="380" cy="33" r="7.5" fill="var(--lampara)" stroke="var(--contorno)" strokeWidth="1.8" />

          <g stroke="var(--contorno)" strokeWidth="1.8" strokeLinejoin="round">
            <path d="M170 446V482M240 446V482" stroke="var(--madera)" strokeWidth="5" strokeLinecap="round" />
            <rect x="150" y="418" width="110" height="42" rx="6" fill="var(--letrero)" />
          </g>
          <text x="205" y="444" textAnchor="middle" className="escena-letrero" id={`letrero-${id}`}>{letrero(nombreGranja)}</text>
        </svg>

        {sensores.map((sensor) => {
          const puesto = PUESTOS[sensor.clase]
          const texto = `${sensor.nombre} ${valorDeSensor(sensor)}`
          return (
            <div
              key={sensor.clase}
              className={`escena-sensor escena-sensor--${puesto.lado}`}
              style={{ left: porcentajeX(puesto.x), top: porcentajeY(puesto.y), width: porcentajeX(puesto.ancho) }}
            >
              <button type="button" onClick={() => onNavegar(destinoAmbiente)} aria-label={`${texto}. Ver ambiente`}>
                <img className="escena-img" src={puesto.url} alt="" />
                {sensor.valor !== null && <span className="escena-sensor-led" aria-hidden="true" />}
                <span className="escena-sensor-lectura">{texto}</span>
              </button>
            </div>
          )
        })}

        <div className="escena-capa escena-capa--delantera" aria-hidden="true">
          {PLANTAS_DELANTERAS.map((planta) => (
            <img key={planta.url} className="escena-planta escena-img" src={planta.url} alt="" style={estiloPlanta(planta)} />
          ))}
        </div>

        <ul className="escena-etiquetas" aria-label="Indicadores de la granja">
          {(['alertas', 'aves', 'sensores', 'galpones'] as const).map((clave) => {
            const kpi = kpiPorId.get(clave)
            if (!kpi) return null
            const texto = clave === 'sensores' && ambiente ? `${ambiente} · ${kpi.valor} sensores` : etiquetaDeKpi(kpi, diaLote)
            return (
              <li key={clave} className={`escena-etiqueta escena-etiqueta--${clave}`}>
                <button type="button" onClick={() => onNavegar(kpi.destino)}>
                  <span className="escena-etiqueta-punto" aria-hidden="true" />
                  <span className="escena-etiqueta-texto">
                    <strong>{texto}</strong>
                    <span>{kpi.detalle}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

export default EscenaGalpon
