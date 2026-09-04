import { IcAlert, IcCheck, IcChevronRight, IcClock, IcDoc } from '@shared/ui/icons/icons'
import type { ItemAtencionAdmin, ResumenAtencionAdmin } from '../model/adminResumen'
import { hace } from '../model/adminResumen'

type Props = ResumenAtencionAdmin & {
  cargando: boolean
  error: string
  onAbrir: (item: ItemAtencionAdmin) => void
  onReintentar: () => void
}

function iconoTipo(tipo: ItemAtencionAdmin['tipo']) {
  if (tipo === 'alerta') return <IcAlert size={17} />
  if (tipo === 'recuperacion') return <IcClock size={17} />
  return <IcDoc size={17} />
}

function PanelAtencionAdmin({
  items,
  alertasCriticas,
  solicitudesPendientes,
  recuperacionesPendientes,
  cargando,
  error,
  onAbrir,
  onReintentar,
}: Props) {
  return (
    <section className="admin-card admin-attention" aria-labelledby="admin-attention-title" aria-busy={cargando}>
      <div className="admin-card-head admin-attention-head">
        <div>
          <p className="admin-section-kicker">Prioridad del día</p>
          <h2 id="admin-attention-title" className="admin-card-title">Necesita tu atención</h2>
          <p className="admin-card-sub">Pendientes transversales ordenados por urgencia</p>
        </div>
        <div className="admin-attention-counts" aria-label="Resumen de pendientes">
          <span><strong>{cargando ? '—' : alertasCriticas}</strong> críticas</span>
          <span><strong>{cargando ? '—' : solicitudesPendientes}</strong> PQRS</span>
          <span><strong>{cargando ? '—' : recuperacionesPendientes}</strong> accesos</span>
        </div>
      </div>

      {error ? (
        <div className="admin-inline-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={onReintentar}>Reintentar</button>
        </div>
      ) : cargando ? (
        <div className="admin-attention-loading" aria-label="Cargando pendientes">
          <span /><span /><span />
        </div>
      ) : items.length === 0 ? (
        <div className="admin-attention-empty">
          <span className="admin-attention-empty-icon" aria-hidden="true"><IcCheck size={20} /></span>
          <div>
            <strong>No hay pendientes prioritarios</strong>
            <p>Las alertas críticas, PQRS y recuperaciones están al día.</p>
          </div>
        </div>
      ) : (
        <ul className="admin-attention-list">
          {items.map((item) => (
            <li key={item.id}>
              <button type="button" className={`admin-attention-item admin-attention-item--${item.tipo}`} onClick={() => onAbrir(item)}>
                <span className="admin-attention-icon" aria-hidden="true">{iconoTipo(item.tipo)}</span>
                <span className="admin-attention-copy">
                  <span className="admin-attention-meta"><strong>{item.etiqueta}</strong><time>{hace(item.fecha)}</time></span>
                  <span className="admin-attention-title">{item.titulo}</span>
                  <span className="admin-attention-detail">{item.detalle}</span>
                </span>
                <IcChevronRight size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default PanelAtencionAdmin
