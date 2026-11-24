import type { CSSProperties } from 'react'
import IconoFigma, { type NombreIconoFigma } from '@shared/ui/icons/IconoFigma'
import { useConteo } from '../hooks/useConteo'
import { formatearNumero, type DeltaMetrica } from '../model/metricas'
import Sparkline from './Sparkline'

type Props = {
  id: string
  etiqueta: string
  icono: NombreIconoFigma
  valor: number | null
  total?: number | null
  detalle: string
  delta: DeltaMetrica | null
  serie: number[] | null
  colorSerie: string
  aviso?: boolean
  cargando: boolean
  cargandoSerie: boolean
  indice: number
  accion: string
  onAbrir: () => void
}

function TarjetaKpiAdmin({
  id, etiqueta, icono, valor, total = null, detalle, delta, serie, colorSerie,
  aviso = false, cargando, cargandoSerie, indice, accion, onAbrir,
}: Props) {
  const contado = useConteo(cargando ? null : valor)

  return (
    <button
      type="button"
      className={`cdc-kpi cdc-entra${aviso ? ' is-aviso' : ''}`}
      style={{ '--i': indice } as CSSProperties}
      onClick={onAbrir}
      aria-label={
        cargando
          ? `${etiqueta}: actualizando`
          : `${etiqueta}: ${valor ?? 'sin dato'}${total !== null ? ` de ${total}` : ''}. ${detalle}${delta ? `. ${delta.texto}` : ''}. ${accion}`
      }
    >
      <span className="cdc-kpi-cabecera">
        <IconoFigma nombre={icono} tamano={16} />
        <span>{etiqueta}</span>
        <IconoFigma nombre="flecha-derecha" tamano={15} className="cdc-kpi-flecha" />
      </span>

      <span className="cdc-kpi-cifra" aria-hidden="true">
        {cargando || contado === null ? <span className="cdc-esqueleto cdc-esqueleto--cifra" /> : formatearNumero(contado)}
        {!cargando && total !== null && <small>/{formatearNumero(total)}</small>}
      </span>

      <span className="cdc-kpi-pie" aria-hidden="true">
        {delta ? (
          <span className={`cdc-delta cdc-delta--${delta.tono}`}>
            <span className="cdc-delta-flecha">{delta.direccion === 'sube' ? '▲' : delta.direccion === 'baja' ? '▼' : '■'}</span>
            {delta.texto}
          </span>
        ) : (
          <span className={`cdc-kpi-detalle${aviso ? ' is-aviso' : ''}`}>{cargando ? 'Consultando…' : detalle}</span>
        )}
      </span>
      {delta && <span className={`cdc-kpi-detalle${aviso ? ' is-aviso' : ''}`} aria-hidden="true">{cargando ? 'Consultando…' : detalle}</span>}

      {cargandoSerie ? (
        <span className="cdc-esqueleto cdc-spark-esqueleto" aria-hidden="true" />
      ) : serie ? (
        <Sparkline valores={serie} color={colorSerie} id={id} />
      ) : (
        <span className="cdc-spark-vacio" aria-hidden="true" />
      )}
    </button>
  )
}

export default TarjetaKpiAdmin
