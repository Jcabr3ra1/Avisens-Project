import IconoFigma from '@shared/ui/icons/IconoFigma'
import { hace, type ItemAtencionAdmin, type ResumenAtencionAdmin } from '../model/adminResumen'
import { useConteo } from '../hooks/useConteo'

type Props = ResumenAtencionAdmin & {
  cargando: boolean
  onAbrir: (item: ItemAtencionAdmin) => void
  onVerBandeja: () => void
}

function DestacadoAtencion({ items, alertasCriticas, solicitudesPendientes, recuperacionesPendientes, cargando, onAbrir, onVerBandeja }: Props) {
  const total = useConteo(cargando ? null : items.length)
  const prioridad = items[0]
  const alDia = !cargando && items.length === 0

  return (
    <section className={`cdc-destacado cdc-entra${alDia ? ' is-al-dia' : ''}`} aria-labelledby="cdc-destacado-titulo" aria-busy={cargando}>
      <div className="cdc-destacado-cifra">
        <h2 id="cdc-destacado-titulo">Pendientes de atención</h2>
        <strong aria-live="polite">{cargando || total === null ? '–' : total}</strong>
        <p>
          {solicitudesPendientes} PQRS · {recuperacionesPendientes} accesos · {alertasCriticas}{' '}
          {alertasCriticas === 1 ? 'alerta crítica' : 'alertas críticas'}
        </p>
      </div>

      <div className="cdc-destacado-caso">
        {cargando ? (
          <p className="cdc-destacado-espera">Consultando alertas, solicitudes y recuperaciones…</p>
        ) : prioridad ? (
          <>
            <span className="cdc-destacado-meta">
              {prioridad.etiqueta} · <time dateTime={prioridad.fecha}>{hace(prioridad.fecha)}</time>
            </span>
            <span className="cdc-destacado-titulo">{prioridad.titulo}</span>
            <span className="cdc-destacado-detalle">{prioridad.detalle}</span>
            <span className="cdc-destacado-acciones">
              <button type="button" className="cdc-boton-maiz" onClick={() => onAbrir(prioridad)}>
                Revisar caso <span className="cdc-boton-maiz-flecha"><IconoFigma nombre="flecha-derecha" tamano={15} /></span>
              </button>
              {items.length > 1 && (
                <button type="button" className="cdc-boton-fantasma" onClick={onVerBandeja}>
                  Ver los {items.length}
                </button>
              )}
            </span>
          </>
        ) : (
          <>
            <span className="cdc-destacado-ok" aria-hidden="true"><IconoFigma nombre="verificado" tamano={20} /></span>
            <span className="cdc-destacado-titulo">La bandeja está al día</span>
            <span className="cdc-destacado-detalle">No hay alertas, solicitudes ni recuperaciones de acceso esperando respuesta.</span>
          </>
        )}
      </div>
    </section>
  )
}

export default DestacadoAtencion
