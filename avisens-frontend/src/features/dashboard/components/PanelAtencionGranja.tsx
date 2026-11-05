import { IcAlert, IcChart, IcCheck, IcThermo } from '@shared/ui/icons/icons'
import type { ItemAtencionGranja, TipoAtencionGranja } from '../model/resumenGranja'

type Props = {
  items: ItemAtencionGranja[]
  cargando: boolean
  errorCrecimiento?: string
  onReintentarCrecimiento?: () => void
}

function IconoDeItem({ tipo }: { tipo: TipoAtencionGranja }) {
  if (tipo === 'alerta') return <IcAlert size={16} />
  if (tipo === 'crecimiento') return <IcChart size={16} />
  return <IcThermo size={16} />
}

function PanelAtencionGranja({ items, cargando, errorCrecimiento, onReintentarCrecimiento }: Props) {
  const criticos = items.filter((item) => item.critico).length
  return (
    <section className="rsm-atencion" aria-labelledby="resumen-atencion-titulo" aria-busy={cargando}>
      <header className="rsm-cabecera">
        <div>
          <h2 id="resumen-atencion-titulo" className="rsm-titulo">
            Necesita tu atención
            {!cargando && criticos > 0 && (
              <span className="rsm-etiqueta rsm-etiqueta--critico">
                {criticos} {criticos === 1 ? 'urgente' : 'urgentes'}
              </span>
            )}
          </h2>
          <p className="rsm-subtitulo">Lo que conviene revisar hoy, lo más importante primero</p>
        </div>

      </header>

      {errorCrecimiento && (
        <p className="rsm-aviso" role="alert">
          {errorCrecimiento} No podemos confirmar el estado de crecimiento de los lotes.
          {onReintentarCrecimiento && <button type="button" onClick={onReintentarCrecimiento}>Reintentar</button>}
        </p>
      )}

      {cargando ? (
        <div className="rsm-carga" aria-label="Cargando pendientes">
          <span /><span /><span />
        </div>
      ) : items.length === 0 ? (
        <div className="rsm-vacio">
          <span className="rsm-vacio-icono" aria-hidden="true">
            {errorCrecimiento ? <IcAlert size={16} /> : <IcCheck size={18} />}
          </span>
          <div>
            <strong>
              {errorCrecimiento
                ? 'No pudimos revisar los lotes'
                : 'Todo en orden'}
            </strong>
            <p>
              {errorCrecimiento
                ? 'Vuelve a intentarlo para consultar las reglas de crecimiento.'
                : 'No hay alertas abiertas y los sensores de esta granja reportan dentro de su rango.'}
            </p>
          </div>
        </div>
      ) : (
        <ul className="rsm-pendientes">
          {items.map((item) => (
            <li key={item.id}>
              <div className={`rsm-pendiente rsm-pendiente--${item.tipo}${item.critico ? ' is-critico' : ''}`}>
                <span className="rsm-pendiente-icono" aria-hidden="true"><IconoDeItem tipo={item.tipo} /></span>
                <span className="rsm-pendiente-copia">
                  <span className="rsm-pendiente-titulo">{item.titulo}</span>
                  <span className="rsm-pendiente-detalle">{item.detalle}</span>
                </span>
                <span className="rsm-nivel">
                  <span aria-hidden="true" />
                  {item.critico ? 'Urgente' : 'Por revisar'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default PanelAtencionGranja
