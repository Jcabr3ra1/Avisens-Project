import { IcAlert, IcArrowRight, IcCheck } from '@shared/ui/icons/icons'
import { hace, type ItemAtencionAdmin, type ResumenAtencionAdmin } from '../model/adminResumen'
import { useConteo } from '../hooks/useConteo'

type Props = ResumenAtencionAdmin & {
  cargando: boolean
  onAbrir: (item: ItemAtencionAdmin) => void
  onVerBandeja: () => void
}

function DestacadoAtencion({
  items,
  alertasCriticas,
  solicitudesPendientes,
  recuperacionesPendientes,
  cargando,
  onAbrir,
  onVerBandeja,
}: Props) {
  const total = useConteo(cargando ? null : items.length)
  const prioridad = items[0]
  const alDia = !cargando && items.length === 0
  const critico = !cargando && alertasCriticas > 0
  const tono = alDia ? 'ok' : critico ? 'peligro' : 'atencion'

  return (
    <section
      className={`cdc-estado-barra cdc-estado-barra--${tono} cdc-entra`}
      aria-labelledby="cdc-destacado-titulo"
      aria-busy={cargando}
    >
      <div className="cdc-estado-principal">
        <span className={`cdc-estado-icono cdc-estado-icono--${tono}`} aria-hidden="true">
          {alDia ? <IcCheck size={18} /> : <IcAlert size={18} />}
        </span>

        <div className="cdc-estado-texto">
          {cargando ? (
            <>
              <h2 id="cdc-destacado-titulo">Revisando pendientes…</h2>
              <p>Consultando alertas críticas, solicitudes PQRS y recuperaciones de acceso.</p>
            </>
          ) : prioridad ? (
            <>
              <div className="cdc-estado-encabezado">
                <span className="cdc-estado-etiqueta">
                  {prioridad.etiqueta} · <time dateTime={prioridad.fecha}>{hace(prioridad.fecha)}</time>
                </span>
                <span className="cdc-estado-total" aria-live="polite">
                  {total ?? items.length} {items.length === 1 ? 'pendiente' : 'pendientes'}
                </span>
              </div>
              <h2 id="cdc-destacado-titulo">{prioridad.titulo}</h2>
              <p>{prioridad.detalle}</p>
            </>
          ) : (
            <>
              <h2 id="cdc-destacado-titulo">La bandeja está al día</h2>
              <p>No hay alertas críticas, solicitudes PQRS ni recuperaciones esperando respuesta.</p>
            </>
          )}
        </div>
      </div>

      <div className="cdc-estado-derecha">
        <ul className="cdc-estado-chips" aria-label="Desglose de pendientes">
          <li className={solicitudesPendientes > 0 ? 'is-activo' : undefined}>
            <strong>{cargando ? '—' : solicitudesPendientes}</strong>
            <span>PQRS</span>
          </li>
          <li className={recuperacionesPendientes > 0 ? 'is-activo' : undefined}>
            <strong>{cargando ? '—' : recuperacionesPendientes}</strong>
            <span>Accesos</span>
          </li>
          <li className={alertasCriticas > 0 ? 'is-peligro' : undefined}>
            <strong>{cargando ? '—' : alertasCriticas}</strong>
            <span>{alertasCriticas === 1 ? 'Alerta crítica' : 'Alertas críticas'}</span>
          </li>
        </ul>

        {!cargando && prioridad && (
          <div className="cdc-estado-acciones">
            <button type="button" className="adm-btn adm-btn--primario" onClick={() => onAbrir(prioridad)}>
              Revisar caso
              <IcArrowRight size={14} aria-hidden="true" />
            </button>
            {items.length > 1 && (
              <button type="button" className="adm-btn adm-btn--secundario" onClick={onVerBandeja}>
                Ver los {items.length}
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

export default DestacadoAtencion
