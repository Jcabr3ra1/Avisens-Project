import { useId } from 'react'
import type { CSSProperties } from 'react'
import type { TonoGranja } from '../../model/estadoGranja'
import {
  estadoDeLampara, lecturaDeSensor, sombraDelGalpon, type Astro, type ClaseSensor, type SensorEscena,
} from '../../model/escenaGalpon'
import galponImagen from '../../assets/escena/galpon.webp'
import sensorTemperatura from '../../assets/escena/sensores/temperatura.webp'
import sensorHumedad from '../../assets/escena/sensores/humedad.webp'
import sensorCo2 from '../../assets/escena/sensores/co2.webp'
import sensorAmoniaco from '../../assets/escena/sensores/amoniaco.webp'
import sensorLuz from '../../assets/escena/sensores/luz.webp'

type Props = {
  nombreGranja: string
  tono: TonoGranja
  diaLote: number | null
  aves: number
  sensores: SensorEscena[]
  astro: Astro
  destinoSensores: string
  onNavegar: (destino: string) => void
}

const ESCENA = { ancho: 760, alto: 484 }
const GALPON = { x: 100, y: 44, ancho: 560, alto: 408 }
const SUELO_Y = 451
const VIGA_Y = 165
const SENSOR_ALTO = 46
const SENSOR_CENTRO_Y = 208
const LARGO_MAXIMO_LETRERO = 11

const ARBUSTOS = [
  { x: -30, r: 46, lejos: true }, { x: 22, r: 38, lejos: true }, { x: 70, r: 30, lejos: true },
  { x: 0, r: 30, lejos: false }, { x: 48, r: 24, lejos: false },
  { x: 690, r: 32, lejos: true }, { x: 736, r: 44, lejos: true }, { x: 790, r: 36, lejos: true },
  { x: 716, r: 24, lejos: false }, { x: 764, r: 30, lejos: false },
]

type PuestoSensor = { x: number; url: string; relacion: number }

const PUESTOS: Record<ClaseSensor, PuestoSensor> = {
  temperatura: { x: 276, url: sensorTemperatura, relacion: 166 / 240 },
  humedad: { x: 328, url: sensorHumedad, relacion: 204 / 240 },
  luz: { x: 380, url: sensorLuz, relacion: 240 / 233 },
  co2: { x: 432, url: sensorCo2, relacion: 197 / 240 },
  amoniaco: { x: 484, url: sensorAmoniaco, relacion: 232 / 240 },
}

const porcentajeX = (x: number) => `${((x / ESCENA.ancho) * 100).toFixed(3)}%`
const porcentajeY = (y: number) => `${((y / ESCENA.alto) * 100).toFixed(3)}%`

function letrero(nombre: string): string {
  const limpio = nombre.trim()
  return limpio.length > LARGO_MAXIMO_LETRERO ? `${limpio.slice(0, LARGO_MAXIMO_LETRERO - 1)}…` : limpio
}

function EscenaGalpon({ nombreGranja, tono, diaLote, aves, sensores, astro, destinoSensores, onNavegar }: Props) {
  const id = useId().replace(/:/g, '')
  const lampara = estadoDeLampara(tono)
  const sombra = sombraDelGalpon(astro)
  const descripcion = aves > 0
    ? `Galpón de ${nombreGranja} con ${aves.toLocaleString('es-CO')} aves${diaLote === null ? '' : ` en el día ${diaLote}`}`
    : `Galpón de ${nombreGranja}, sin aves por ahora`
  const centroSombra = 380 + sombra.desplazamiento * 70

  return (
    <div className={`escena escena--${lampara.color}`}>
      <div
        className="escena-lienzo"
        role="group"
        aria-label={descripcion}
        style={{ '--forma-galpon': `url(${galponImagen})` } as CSSProperties}
      >
        <svg className="escena-capa escena-suelo" viewBox={`0 0 ${ESCENA.ancho} ${ESCENA.alto}`} aria-hidden="true" overflow="visible">
          <defs>
            <filter id={`sombra-${id}`} x="-20%" y="-200%" width="140%" height="500%">
              <feGaussianBlur stdDeviation="8" />
            </filter>
            <radialGradient id={`luz-${id}`}>
              <stop offset="0" stopColor="#ffd98a" stopOpacity="0.95" />
              <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
            </radialGradient>
          </defs>
          <g className="escena-arbustos" aria-hidden="true">
            {ARBUSTOS.map((arbusto) => (
              <circle
                key={`${arbusto.x}-${arbusto.r}`}
                className={arbusto.lejos ? 'escena-seto escena-seto--lejos' : 'escena-seto'}
                cx={arbusto.x}
                cy={SUELO_Y - arbusto.r * 0.45}
                r={arbusto.r}
              />
            ))}
          </g>
          <rect className="escena-piso" x="-1600" y={SUELO_Y} width="4000" height="260" />
          <rect className="escena-piso-borde" x="-1600" y={SUELO_Y} width="4000" height="4" />
          <ellipse
            className="escena-sombra"
            cx={centroSombra}
            cy={SUELO_Y + 3}
            rx={GALPON.ancho * 0.52 * sombra.alargamiento}
            ry="11"
            filter={`url(#sombra-${id})`}
          />
          <ellipse className="escena-luz-piso" cx="380" cy={SUELO_Y + 10} rx="200" ry="18" fill={`url(#luz-${id})`} />
        </svg>

        <img
          className="escena-galpon"
          src={galponImagen}
          alt=""
          aria-hidden="true"
          style={{
            left: porcentajeX(GALPON.x), top: porcentajeY(GALPON.y),
            width: porcentajeX(GALPON.ancho), height: porcentajeY(GALPON.alto),
          }}
        />
        <span
          className="escena-tinte"
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
          <path d="M380 50V34" stroke="var(--techo-sombra)" strokeWidth="3" strokeLinecap="round" />
          <circle className={lampara.pulsa ? 'escena-halo escena-halo--pulsa' : 'escena-halo'} cx="380" cy="26" r="15" fill="var(--lampara)" />
          <circle className="escena-lampara" cx="380" cy="26" r="7.5" fill="var(--lampara)" stroke="var(--contorno)" strokeWidth="1.8" />

          <g stroke="var(--contorno)" strokeWidth="1.4" strokeLinecap="round">
            {sensores.map((sensor) => {
              const puesto = PUESTOS[sensor.clase]
              return <path key={sensor.clase} d={`M${puesto.x} ${VIGA_Y}V${SENSOR_CENTRO_Y - SENSOR_ALTO / 2 + 3}`} />
            })}
          </g>
          <g fill="var(--contorno)">
            {sensores.map((sensor) => <circle key={sensor.clase} cx={PUESTOS[sensor.clase].x} cy={VIGA_Y} r="2.4" />)}
          </g>

          <g stroke="var(--contorno)" strokeWidth="1.8" strokeLinejoin="round">
            <path d="M58 426V462M118 426V462" stroke="var(--madera)" strokeWidth="5" strokeLinecap="round" />
            <rect x="34" y="398" width="108" height="40" rx="6" fill="var(--letrero)" />
          </g>
          <text x="88" y="424" textAnchor="middle" className="escena-letrero">{letrero(nombreGranja)}</text>
        </svg>

        {sensores.map((sensor) => {
          const puesto = PUESTOS[sensor.clase]
          const ancho = SENSOR_ALTO * puesto.relacion
          const texto = `${sensor.nombre}: ${lecturaDeSensor(sensor)}`
          return (
            <div
              key={sensor.clase}
              className="escena-sensor"
              style={{ left: porcentajeX(puesto.x), top: porcentajeY(SENSOR_CENTRO_Y), width: porcentajeX(ancho) }}
            >
              <button type="button" onClick={() => onNavegar(destinoSensores)} aria-label={`${texto}. Ver ambiente`}>
                <img src={puesto.url} alt="" />
                {sensor.valor !== null && <span className="escena-sensor-led" aria-hidden="true" />}
                <span className="escena-sensor-lectura">{texto}</span>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default EscenaGalpon
