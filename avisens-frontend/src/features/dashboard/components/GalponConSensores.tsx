import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useFaseDelDia } from '../hooks/useFaseDelDia'
import { lecturaDeSensor, sensorActivo, type ClaseSensor, type FaseDelDia, type SensorEscena } from '../model/escenaGalpon'
import fondoAmanecer from '../assets/escena/fondos/fondo-amanecer-low-poly.webp'
import fondoDia from '../assets/escena/fondos/fondo-dia-low-poly.webp'
import fondoTarde from '../assets/escena/fondos/fondo-tarde-low-poly.webp'
import fondoNoche from '../assets/escena/fondos/fondo-noche-low-poly.webp'
import DialogoSensor, { type LadoDialogo } from './escena/DialogoSensor'
import { IMAGENES_SENSOR } from './escena/imagenesSensor'
import VisorGalpon, { type Proyeccion } from './escena/VisorGalpon'

type Props = {
  nombre: string
  sensores: SensorEscena[]
  aves: number
  diaLote: number | null
}

const FONDOS: Record<FaseDelDia, string> = { amanecer: fondoAmanecer, dia: fondoDia, tarde: fondoTarde, noche: fondoNoche }
const ESCENA = { ancho: 840, alto: 420 }
const CHIP = { ancho: 176 }

type Puesto = { lado: LadoDialogo; x: number; y: number; salida: 'derecha' | 'izquierda' | 'abajo' }

const PUESTOS: Record<ClaseSensor, Puesto> = {
  temperatura: { lado: 'derecha', x: 0, y: 72, salida: 'derecha' },
  humedad: { lado: 'derecha', x: 0, y: 208, salida: 'derecha' },
  co2: { lado: 'izquierda', x: ESCENA.ancho - CHIP.ancho, y: 72, salida: 'izquierda' },
  amoniaco: { lado: 'izquierda', x: ESCENA.ancho - CHIP.ancho, y: 208, salida: 'izquierda' },
  luz: { lado: 'abajo', x: (ESCENA.ancho - CHIP.ancho) / 2, y: 6, salida: 'abajo' },
}

const porcentaje = (valor: number, total: number) => `${((valor / total) * 100).toFixed(3)}%`

type Abierto = { clase: ClaseSensor; ancla: DOMRect }

function GalponConSensores({ nombre, sensores, aves, diaLote }: Props) {
  const activos = sensores.filter(sensorActivo)
  const fase = useFaseDelDia()
  const clases = activos.map((sensor) => sensor.clase)
  const [abierto, setAbierto] = useState<Abierto | null>(null)
  const disparador = useRef<HTMLElement | null>(null)
  const lienzo = useRef<HTMLDivElement>(null)
  const proyeccion = useRef<Proyeccion>({})
  const trazos = useRef(new Map<ClaseSensor, { linea: SVGLineElement | null; punto: SVGCircleElement | null }>())
  const sensorAbierto = abierto ? activos.find((sensor) => sensor.clase === abierto.clase) ?? null : null

  const trazar = useCallback(() => {
    const raiz = lienzo.current
    if (!raiz) return
    const marco = raiz.getBoundingClientRect()
    const visor = raiz.querySelector<HTMLElement>('.gsr-visor')
    const desfaseX = visor ? visor.offsetLeft : 0
    const desfaseY = visor ? visor.offsetTop : 0
    trazos.current.forEach((elementos, clase) => {
      const blanco = proyeccion.current[clase]
      const boton = raiz.querySelector<HTMLElement>(`[data-clase="${clase}"]`)
      if (!blanco || !boton || !elementos.linea || !elementos.punto) return
      const caja = boton.getBoundingClientRect()
      const salida = PUESTOS[clase].salida
      const x1 = (salida === 'derecha' ? caja.right : salida === 'izquierda' ? caja.left : caja.left + caja.width / 2) - marco.left
      const y1 = (salida === 'abajo' ? caja.bottom : caja.top + caja.height / 2) - marco.top
      elementos.linea.setAttribute('x1', x1.toFixed(1))
      elementos.linea.setAttribute('y1', y1.toFixed(1))
      elementos.linea.setAttribute('x2', (blanco.x + desfaseX).toFixed(1))
      elementos.linea.setAttribute('y2', (blanco.y + desfaseY).toFixed(1))
      elementos.punto.setAttribute('cx', (blanco.x + desfaseX).toFixed(1))
      elementos.punto.setAttribute('cy', (blanco.y + desfaseY).toFixed(1))
    })
  }, [])

  const alProyectar = useCallback((nueva: Proyeccion) => {
    proyeccion.current = nueva
    trazar()
  }, [trazar])

  const firma = clases.join('|')
  useEffect(() => {
    trazar()
  }, [firma, trazar])

  const cerrar = useCallback(() => {
    setAbierto(null)
    disparador.current?.focus()
  }, [])

  function abrir(sensor: SensorEscena, boton: HTMLElement) {
    disparador.current = boton
    setAbierto({ clase: sensor.clase, ancla: boton.getBoundingClientRect() })
  }

  return (
    <div className="gsr">
      <div
        className="gsr-lienzo"
        ref={lienzo}
        data-fase={fase}
        style={{ '--fondo': `url(${FONDOS[fase]})` } as CSSProperties}
      >
        <VisorGalpon clases={clases} nombre={nombre} fase={fase} aves={aves} diaLote={diaLote} onProyeccion={alProyectar} />

        <svg className="gsr-lineas" aria-hidden="true">
          {activos.map((sensor) => (
            <g
              key={sensor.clase}
              className="gsr-linea"
              data-estado={sensor.estado}
              data-activo={abierto?.clase === sensor.clase || undefined}
            >
              <line
                ref={(elemento) => {
                  const previo = trazos.current.get(sensor.clase)
                  trazos.current.set(sensor.clase, { linea: elemento, punto: previo?.punto ?? null })
                }}
              />
              <circle
                r="5"
                ref={(elemento) => {
                  const previo = trazos.current.get(sensor.clase)
                  trazos.current.set(sensor.clase, { linea: previo?.linea ?? null, punto: elemento })
                }}
              />
            </g>
          ))}
        </svg>

        <ul className="gsr-sensores">
          {activos.map((sensor) => {
            const puesto = PUESTOS[sensor.clase]
            return (
              <li
                key={sensor.clase}
                style={{
                  left: porcentaje(puesto.x, ESCENA.ancho), top: porcentaje(puesto.y, ESCENA.alto),
                  width: porcentaje(CHIP.ancho, ESCENA.ancho),
                }}
              >
                <button
                  type="button"
                  className="gsr-sensor"
                  data-clase={sensor.clase}
                  data-estado={sensor.estado}
                  onClick={(evento) => abrir(sensor, evento.currentTarget)}
                  aria-label={`${sensor.nombre}: ${lecturaDeSensor(sensor)}. Ver señal y datos`}
                  aria-haspopup="dialog"
                  aria-expanded={abierto?.clase === sensor.clase}
                >
                  <img src={IMAGENES_SENSOR[sensor.clase]} alt="" />
                  <span className="gsr-sensor-texto">
                    <span className="gsr-sensor-nombre">{sensor.nombre}</span>
                    <strong className="gsr-sensor-valor">{lecturaDeSensor(sensor)}</strong>
                  </span>
                  <span className="gsr-sensor-led" aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {abierto && sensorAbierto && (
        <DialogoSensor
          sensor={sensorAbierto}
          imagen={IMAGENES_SENSOR[sensorAbierto.clase]}
          ancla={abierto.ancla}
          lado={PUESTOS[sensorAbierto.clase].lado}
          onCerrar={cerrar}
        />
      )}
    </div>
  )
}

export default GalponConSensores
