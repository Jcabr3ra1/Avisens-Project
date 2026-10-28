import type { CSSProperties } from 'react'
import IconoFigma, { type NombreIconoFigma } from '@shared/ui/icons/IconoFigma'
import { useConteo } from '../hooks/useConteo'

export type TonoSegmento = 'bosque' | 'salvia' | 'maiz' | 'peligro' | 'neutro'

export type SegmentoIndicador = {
  etiqueta: string
  valor: number
  tono: TonoSegmento
}

type Props = {
  etiqueta: string
  icono: NombreIconoFigma
  valor: number | null
  total?: number | null
  detalle: string
  segmentos: SegmentoIndicador[]
  aviso?: boolean
  cargando: boolean
  indice: number
  accion: string
  onAbrir: () => void
}

const numero = new Intl.NumberFormat('es-CO')

function TarjetaIndicadorAdmin({ etiqueta, icono, valor, total = null, detalle, segmentos, aviso = false, cargando, indice, accion, onAbrir }: Props) {
  const contado = useConteo(cargando ? null : valor)
  const suma = segmentos.reduce((acumulado, segmento) => acumulado + segmento.valor, 0)
  const visibles = segmentos.filter((segmento) => segmento.valor > 0)

  return (
    <button
      type="button"
      className={`cdc-metrica cdc-entra${aviso ? ' is-aviso' : ''}`}
      style={{ '--i': indice } as CSSProperties}
      onClick={onAbrir}
      aria-label={cargando ? `${etiqueta}: actualizando` : `${etiqueta}: ${valor ?? 'sin dato'}${total !== null ? ` de ${total}` : ''}. ${detalle}. ${accion}`}
    >
      <span className="cdc-metrica-cabecera">
        <IconoFigma nombre={icono} tamano={16} />
        <span>{etiqueta}</span>
        <IconoFigma nombre="flecha-derecha" tamano={15} className="cdc-metrica-flecha" />
      </span>

      <span className="cdc-metrica-cifra" aria-hidden="true">
        {cargando || contado === null ? <span className="cdc-esqueleto cdc-esqueleto--cifra" /> : numero.format(contado)}
        {!cargando && total !== null && <small>/{numero.format(total)}</small>}
      </span>
      <span className="cdc-metrica-detalle">{cargando ? 'Consultando la plataforma…' : detalle}</span>

      <span className="cdc-medidor" aria-hidden="true">
        {suma === 0 || cargando ? (
          <span className="cdc-medidor-vacio" />
        ) : (
          visibles.map((segmento, posicion) => (
            <span
              key={segmento.etiqueta}
              className={`cdc-medidor-tramo cdc-tono--${segmento.tono}`}
              style={{ flexGrow: segmento.valor, '--j': posicion } as CSSProperties}
            />
          ))
        )}
      </span>
      <span className="cdc-leyenda" aria-hidden="true">
        {segmentos.map((segmento) => (
          <span key={segmento.etiqueta} className={segmento.valor === 0 ? 'is-cero' : undefined}>
            <i className={`cdc-tono--${segmento.tono}`} />
            {segmento.etiqueta} <b>{cargando ? '–' : numero.format(segmento.valor)}</b>
          </span>
        ))}
      </span>
    </button>
  )
}

export default TarjetaIndicadorAdmin
