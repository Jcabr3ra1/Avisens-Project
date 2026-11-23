import { formatearPeso } from '@features/guia-crecimiento/model/proyeccion'
import { lineaSparkline } from '../model/estadoLote'

const ANCHO = 320
const ALTO = 110

function GraficaPeso({ serie }: { serie: number[] }) {
  const primero = serie[0]
  const ultimo = serie[serie.length - 1]
  const hayLinea = serie.length >= 2
  const resumen = hayLinea
    ? `Peso promedio de ${formatearPeso(primero)} a ${formatearPeso(ultimo)} en ${serie.length} pesajes`
    : null
  const puntos = hayLinea ? lineaSparkline(serie, ANCHO, ALTO) : ''

  return (
    <figure className="rp-tarjeta rp-grafica" aria-labelledby="rp-grafica-titulo">
      <figcaption className="rp-cab">
        <h2 id="rp-grafica-titulo" className="rp-titulo">Evolución del peso</h2>
        {hayLinea && <p className="rp-cab-meta">{serie.length} pesajes</p>}
      </figcaption>
      {hayLinea && resumen ? (
        <>
          <svg className="rp-grafica-svg" viewBox={`0 0 ${ANCHO} ${ALTO}`} preserveAspectRatio="none" role="img" aria-label={resumen}>
            <polyline className="rp-grafica-area" points={`0,${ALTO} ${puntos} ${ANCHO},${ALTO}`} />
            <polyline className="rp-grafica-linea" points={puntos} />
          </svg>
          <div className="rp-grafica-extremos" aria-hidden="true">
            <span>Primer pesaje <strong>{formatearPeso(primero)}</strong></span>
            <span>Último <strong>{formatearPeso(ultimo)}</strong></span>
          </div>
        </>
      ) : (
        <p className="rp-meta">Se necesitan al menos dos pesajes verificados para trazar la curva.</p>
      )}
    </figure>
  )
}

export default GraficaPeso
