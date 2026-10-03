import type { PuntoCurvaGenetica } from '../api/guiaCrecimiento'
import './GraficaCurva.css'

type Pesaje = { dia: number; pesoG: number }

type Props = {
  puntos: PuntoCurvaGenetica[]
  diaObjetivo: number | null
  pesoObjetivoG: number | null
  diaPlazo: number | null
  pesajes: Pesaje[]
}

const ANCHO = 760
const ALTO = 300
const MARGEN = { arriba: 20, derecha: 24, abajo: 42, izquierda: 54 }

function GraficaCurva({ puntos, diaObjetivo, pesoObjetivoG, diaPlazo, pesajes }: Props) {
  if (puntos.length < 2) return null
  const ordenados = [...puntos].sort((a, b) => a.dia - b.dia)
  const dias = ordenados.map((punto) => punto.dia)
  const pesos = [
    ...ordenados.map((punto) => punto.peso_esperado_g),
    ...pesajes.map((pesaje) => pesaje.pesoG),
    ...(pesoObjetivoG === null ? [] : [pesoObjetivoG]),
  ]
  const minDia = Math.min(...dias)
  const maxDia = Math.max(...dias)
  const maxPeso = Math.max(...pesos, 1)
  const anchoUtil = ANCHO - MARGEN.izquierda - MARGEN.derecha
  const altoUtil = ALTO - MARGEN.arriba - MARGEN.abajo
  const x = (dia: number) => MARGEN.izquierda + ((dia - minDia) / Math.max(maxDia - minDia, 1)) * anchoUtil
  const y = (peso: number) => MARGEN.arriba + (1 - peso / maxPeso) * altoUtil
  const puntosLinea = ordenados.map((punto) => `${x(punto.dia)},${y(punto.peso_esperado_g)}`).join(' ')

  return (
    <div className="guia-grafica-wrap">
      <svg className="guia-grafica" viewBox={`0 0 ${ANCHO} ${ALTO}`} role="img" aria-labelledby="guia-grafica-titulo guia-grafica-desc">
        <title id="guia-grafica-titulo">Curva genética y objetivo de peso</title>
        <desc id="guia-grafica-desc">La línea verde muestra la curva genética, el objetivo y el plazo aparecen señalados, y los círculos son pesajes reales.</desc>
        <line x1={MARGEN.izquierda} y1={ALTO - MARGEN.abajo} x2={ANCHO - MARGEN.derecha} y2={ALTO - MARGEN.abajo} className="guia-grafica-eje" />
        <line x1={MARGEN.izquierda} y1={MARGEN.arriba} x2={MARGEN.izquierda} y2={ALTO - MARGEN.abajo} className="guia-grafica-eje" />
        <polyline points={puntosLinea} className="guia-grafica-curva" />
        {diaPlazo !== null && diaPlazo >= minDia && diaPlazo <= maxDia && (
          <line x1={x(diaPlazo)} y1={MARGEN.arriba} x2={x(diaPlazo)} y2={ALTO - MARGEN.abajo} className="guia-grafica-plazo" />
        )}
        {diaObjetivo !== null && pesoObjetivoG !== null && (
          <circle cx={x(diaObjetivo)} cy={y(pesoObjetivoG)} r="7" className="guia-grafica-objetivo" />
        )}
        {pesajes.map((pesaje) => (
          <circle key={`${pesaje.dia}-${pesaje.pesoG}`} cx={x(pesaje.dia)} cy={y(pesaje.pesoG)} r="5" className="guia-grafica-real" />
        ))}
        <text x={MARGEN.izquierda} y={ALTO - 12} className="guia-grafica-etiqueta">Día {minDia}</text>
        <text x={ANCHO - MARGEN.derecha} y={ALTO - 12} textAnchor="end" className="guia-grafica-etiqueta">Día {maxDia}</text>
        <text x={MARGEN.izquierda - 8} y={MARGEN.arriba + 4} textAnchor="end" className="guia-grafica-etiqueta">{Math.round(maxPeso)} g</text>
      </svg>
      <div className="guia-leyenda" aria-label="Leyenda de la gráfica">
        <span><i className="guia-leyenda-muestra guia-leyenda-muestra--curva" /> Curva genética</span>
        <span><i className="guia-leyenda-muestra guia-leyenda-muestra--objetivo" /> Objetivo</span>
        <span><i className="guia-leyenda-muestra guia-leyenda-muestra--real" /> Pesajes reales</span>
        <span><i className="guia-leyenda-muestra guia-leyenda-muestra--plazo" /> Plazo</span>
      </div>
      <div className="guia-tabla-scroll">
        <table className="guia-tabla">
          <caption>Datos de la curva y pesajes reales</caption>
          <thead><tr><th scope="col">Día</th><th scope="col">Curva (g)</th><th scope="col">Pesaje real (g)</th></tr></thead>
          <tbody>{ordenados.map((punto) => (
            <tr key={punto.id}>
              <th scope="row">{punto.dia}</th>
              <td>{Math.round(punto.peso_esperado_g).toLocaleString('es-CO')}</td>
              <td>{pesajes.find((pesaje) => pesaje.dia === punto.dia)?.pesoG.toLocaleString('es-CO') ?? '—'}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}

export default GraficaCurva