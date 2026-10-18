import { IcBarn, IcChevronRight } from '@shared/ui/icons/icons'
import type { FilaGalpon } from '../model/resumenGranja'

type Props = {
  filas: FilaGalpon[]
  galponId: number | null
  onSeleccionar: (id: number) => void
  onGestionar: () => void
}

const enteros = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })

function EstadoFila({ fila }: { fila: FilaGalpon }) {
  if (!fila.activo) return <span className="resumen-galpon-estado is-inactivo">Inactivo</span>
  if (fila.urgentes > 0) {
    return <span className="resumen-galpon-estado is-critico">{fila.urgentes} {fila.urgentes === 1 ? 'crítica' : 'críticas'}</span>
  }
  if (fila.alertas > 0) {
    return <span className="resumen-galpon-estado is-atencion">{fila.alertas} {fila.alertas === 1 ? 'alerta' : 'alertas'}</span>
  }
  if (!fila.lote) return <span className="resumen-galpon-estado is-inactivo">Sin lote</span>
  return <span className="resumen-galpon-estado is-ok">En orden</span>
}

function PanelGalpones({ filas, galponId, onSeleccionar, onGestionar }: Props) {
  return (
    <section className="admin-card resumen-galpones" aria-labelledby="resumen-galpones-titulo">
      <div className="admin-card-head">
        <div>
          <h2 id="resumen-galpones-titulo" className="admin-card-title">Tus galpones</h2>
          <p className="admin-card-sub">Elige uno para ver su ambiente, su lote y su plano aquí abajo</p>
        </div>
        <button type="button" className="admin-card-link" onClick={onGestionar}>
          Gestionar <IcChevronRight size={13} />
        </button>
      </div>

      <ul className="resumen-galpones-lista">
        {filas.map((fila) => {
          const seleccionado = fila.id === galponId
          return (
            <li key={fila.id}>
              <button
                type="button"
                className={`resumen-galpon${seleccionado ? ' is-seleccionado' : ''}`}
                aria-pressed={seleccionado}
                onClick={() => onSeleccionar(fila.id)}
              >
                <span className="resumen-galpon-icono" aria-hidden="true"><IcBarn size={16} /></span>
                <span className="resumen-galpon-copia">
                  <span className="resumen-galpon-titulo">
                    <strong>{fila.nombre}</strong>
                    <span className="resumen-galpon-codigo">{fila.codigo}</span>
                  </span>
                  <span className="resumen-galpon-detalle">
                    {fila.lote
                      ? `${fila.lote.codigo} · día ${fila.lote.dia} · ${enteros.format(fila.lote.aves)} aves`
                      : 'Sin lote activo'}
                  </span>
                  {fila.lecturas.length > 0 && (
                    <span className="resumen-galpon-lecturas">{fila.lecturas.join(' · ')}</span>
                  )}
                </span>
                <EstadoFila fila={fila} />
                <IcChevronRight size={15} aria-hidden="true" className="resumen-galpon-flecha" />
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default PanelGalpones
