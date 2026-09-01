import type { Lote } from '@features/lotes/api/lotes'
import { diasDeVida } from '../model/granjaDetalle'

interface Props {
  lote: Lote
  seleccionado: boolean
  onSeleccionar: () => void
}

const ETIQUETA: Record<string, string> = {
  activo: 'Activo',
  finalizado: 'Finalizado',
  inactivo: 'Inactivo',
}

function TarjetaLote({ lote, seleccionado, onSeleccionar }: Props) {
  const esActivo = lote.estado === 'activo'
  const dias = diasDeVida(lote.fecha_ingreso)

  return (
    <div
      role="radio"
      aria-checked={seleccionado}
      tabIndex={0}
      className={`gd-lote${seleccionado ? ' is-seleccionado' : ''}${esActivo ? ' is-actual' : ''}`}
      onClick={onSeleccionar}
      onKeyDown={(evento) => {
        if (evento.key === 'Enter' || evento.key === ' ') {
          evento.preventDefault()
          onSeleccionar()
        }
      }}
    >
      <div className="gd-lote-cabecera">
        <code>{lote.codigo}</code>
        <span className={`gd-lote-estado gd-lote-estado--${lote.estado}`}>
          {ETIQUETA[lote.estado] ?? lote.estado}
        </span>
      </div>
      <div className="gd-lote-datos">
        <span>
          <strong>{lote.cantidad_inicial.toLocaleString()}</strong> aves
        </span>
        <span>{esActivo ? `${dias} días` : `${dias} días al cierre`}</span>
      </div>
      <span className="gd-lote-pie">
        Ingreso {lote.fecha_ingreso.slice(0, 10)} · {lote.proveedor.nombre}
      </span>
    </div>
  )
}

export default TarjetaLote
