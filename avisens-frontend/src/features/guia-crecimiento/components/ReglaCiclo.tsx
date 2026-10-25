import { useRef } from 'react'
import type { KeyboardEvent, PointerEvent as EventoPuntero, CSSProperties } from 'react'
import type { SeveridadAnomalia } from '@features/predicciones/api/predicciones'
import Pollito from '@shared/ui/ilustraciones/Pollito'
import { etiquetaSeveridad } from '../model/confianza'
import {
  diaDeFraccion, diaTrasTecla, marcasDeRegla, posicionDeDia,
} from '../model/reglaCiclo'
import { colorDeEdad, escalaDelPollito } from '@features/dashboard/model/escenaGalpon'
import './ReglaCiclo.css'

type Props = {
  primerDia: number
  diaFinal: number
  diaActual: number
  diaSeleccionado: number
  diasConPesaje: number[]
  alertas: { dia: number; severidad: SeveridadAnomalia }[]
  etiquetaSalida: string
  detalleSalida: string
  onDiaChange: (dia: number) => void
}

const ESCALA_EN_REGLA = 1.35

function ReglaCiclo({
  primerDia, diaFinal, diaActual, diaSeleccionado, diasConPesaje, alertas, etiquetaSalida, detalleSalida, onDiaChange,
}: Props) {
  const pista = useRef<HTMLDivElement>(null)
  const arrastrando = useRef(false)
  const hoy = Math.min(Math.max(diaActual, primerDia), diaFinal)
  const alHoy = posicionDeDia(hoy, primerDia, diaFinal)
  const alSeleccionado = posicionDeDia(diaSeleccionado, primerDia, diaFinal)
  const marcas = marcasDeRegla(primerDia, diaFinal)
  const etiquetaDia = diaSeleccionado === hoy ? `Día ${diaSeleccionado}, hoy` : `Día ${diaSeleccionado}`

  function diaEnPuntero(evento: EventoPuntero<HTMLDivElement>) {
    const caja = pista.current?.getBoundingClientRect()
    if (!caja || caja.width === 0) return
    onDiaChange(diaDeFraccion((evento.clientX - caja.left) / caja.width, primerDia, diaFinal))
  }

  function alPresionar(evento: EventoPuntero<HTMLDivElement>) {
    arrastrando.current = true
    evento.currentTarget.setPointerCapture(evento.pointerId)
    diaEnPuntero(evento)
  }

  function alMover(evento: EventoPuntero<HTMLDivElement>) {
    if (arrastrando.current) diaEnPuntero(evento)
  }

  function alSoltar(evento: EventoPuntero<HTMLDivElement>) {
    arrastrando.current = false
    if (evento.currentTarget.hasPointerCapture(evento.pointerId)) {
      evento.currentTarget.releasePointerCapture(evento.pointerId)
    }
  }

  function alPresionarTecla(evento: KeyboardEvent<HTMLDivElement>) {
    const siguiente = diaTrasTecla(evento.key, diaSeleccionado, primerDia, diaFinal)
    if (siguiente === null) return
    evento.preventDefault()
    onDiaChange(siguiente)
  }

  return (
    <div
      className="regla"
      style={{
        '--edad': colorDeEdad(diaActual),
        '--al-hoy': alHoy,
        '--al-seleccionado': alSeleccionado,
      } as CSSProperties}
    >
      <div ref={pista} className="regla-lienzo">
        <div className="regla-pista" aria-hidden="true">
          <span className="regla-recorrido" />
          <span className="regla-futuro" />
        </div>

        {marcas.map((dia) => (
          <span
            key={dia}
            className="regla-marca"
            style={{ '--pos': posicionDeDia(dia, primerDia, diaFinal) } as CSSProperties}
            aria-hidden="true"
          >
            <i />
            <span>{dia === primerDia ? `Día ${dia}` : dia}</span>
          </span>
        ))}

        <span className="regla-marca" style={{ '--pos': 1 } as CSSProperties} aria-hidden="true">
          <i />
          <span>{diaFinal}</span>
        </span>

        {diasConPesaje.filter((dia) => dia >= primerDia && dia <= diaFinal).map((dia) => (
          <span
            key={`p${dia}`}
            className="regla-pesaje"
            style={{ '--pos': posicionDeDia(dia, primerDia, diaFinal) } as CSSProperties}
            title={`Pesaje del día ${dia}`}
            aria-hidden="true"
          />
        ))}

        <span className="regla-hoy" aria-hidden="true">
          <svg viewBox="-30 -52 60 56" width="60" height="56" overflow="visible">
            <Pollito x={0} y={0} escala={escalaDelPollito(diaActual) * ESCALA_EN_REGLA} />
          </svg>
          <span className="regla-hoy-texto">Hoy</span>
        </span>

        {diaSeleccionado !== hoy && (
          <span className="regla-seleccion" aria-hidden="true">
            <span className="regla-seleccion-dia">Día {diaSeleccionado}</span>
          </span>
        )}

        <span className="regla-salida" aria-hidden="true">
          <span className="regla-salida-texto">
            <strong>{etiquetaSalida}</strong>
            <span>{detalleSalida}</span>
          </span>
          <svg viewBox="0 0 22 40" width="22" height="40" aria-hidden="true">
            <path d="M3 38V2" stroke="var(--regla-linea)" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M3 3H20L15 9.5L20 16H3z" fill="var(--maiz, #e3c565)" stroke="var(--regla-linea)" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        </span>

        {alertas.map((alerta, indice) => (
        <button
          key={`${alerta.dia}-${indice}`}
          type="button"
          className={`regla-alerta regla-alerta--${alerta.severidad}`}
          style={{ '--pos': posicionDeDia(alerta.dia, primerDia, diaFinal) } as CSSProperties}
          onClick={() => onDiaChange(alerta.dia)}
          aria-label={`${etiquetaSeveridad(alerta.severidad)}: alerta del día ${alerta.dia}`}
        >
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d="M8 1.5L15 14H1z" fill="currentColor" stroke="var(--surface-base)" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        </button>
        ))}

        <div
          className="regla-control"
          role="slider"
          tabIndex={0}
          aria-label="Día del ciclo del lote"
          aria-valuemin={primerDia}
          aria-valuemax={diaFinal}
          aria-valuenow={diaSeleccionado}
          aria-valuetext={etiquetaDia}
          onPointerDown={alPresionar}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          onPointerCancel={alSoltar}
          onKeyDown={alPresionarTecla}
        />
      </div>
    </div>
  )
}

export default ReglaCiclo
