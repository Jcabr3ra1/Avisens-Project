import { puntosDeGrafica } from '../model/granjaDetalle'

interface Props {
  titulo: string
  valores: (number | null)[]
  unidad?: string
  decimales?: number
}

const ANCHO = 220
const ALTO = 52

// Sparkline en SVG plano. No se carga una librería de gráficas para dibujar
// una línea: sería más peso que la página entera.
function MiniGrafica({ titulo, valores, unidad = '', decimales = 1 }: Props) {
  const puntos = puntosDeGrafica(valores, ANCHO, ALTO)
  const definidos = valores.filter((valor): valor is number => valor !== null)
  const ultimo = definidos.length > 0 ? definidos[definidos.length - 1] : undefined
  const primero = definidos[0]
  const delta = ultimo !== undefined && primero !== undefined ? ultimo - primero : null

  if (puntos.length === 0) {
    return (
      <figure className="gd-grafica gd-grafica--vacia">
        <figcaption>{titulo}</figcaption>
        <p className="gd-sin-dato">Aún no hay suficientes registros</p>
      </figure>
    )
  }

  const fin = puntos[puntos.length - 1]
  const linea = puntos.map((punto) => `${punto.x},${punto.y}`).join(' ')
  const area = `0,${ALTO} ${linea} ${ANCHO},${ALTO}`

  return (
    <figure className="gd-grafica">
      <figcaption>
        {titulo}
        <strong>
          {ultimo?.toLocaleString(undefined, { maximumFractionDigits: decimales })}
          {unidad && <small>{unidad}</small>}
        </strong>
      </figcaption>
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} preserveAspectRatio="none" role="img"
           aria-label={`${titulo}: ${definidos.length} registros`}>
        <polygon className="gd-grafica-area" points={area} />
        <polyline className="gd-grafica-linea" points={linea} />
        <circle className="gd-grafica-fin" cx={fin.x} cy={fin.y} r="3" />
      </svg>
      {delta !== null && (
        <span className={`gd-grafica-delta${delta >= 0 ? ' is-sube' : ' is-baja'}`}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toLocaleString(undefined, { maximumFractionDigits: decimales })}
          {unidad} desde el inicio
        </span>
      )}
    </figure>
  )
}

export default MiniGrafica
