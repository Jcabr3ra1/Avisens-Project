import { IcCheck, IcChevronRight, IcFlame, IcPhone, IcSnowflake, IcThermo } from '@shared/ui/icons/icons'
import type { EtapaCrmAdmin } from '../model/adminResumen'

type Props = {
  etapas: EtapaCrmAdmin[]
  cargando: boolean
  conversion: number
  onGestionar: () => void
}

function iconoEtapa(nombre: string) {
  const iconos = {
    Fríos: <IcSnowflake size={12} />,
    Tibios: <IcThermo size={12} />,
    Calientes: <IcFlame size={12} />,
    Cerrados: <IcCheck size={12} />,
  }
  return iconos[nombre as keyof typeof iconos]
}

function PanelCrmAdmin({ etapas, cargando, conversion, onGestionar }: Props) {
  const maximo = Math.max(1, ...etapas.map((etapa) => etapa.cantidad))

  return (
    <section className="admin-card admin-crm" aria-label="Resumen de prospectos CRM">
      <div className="admin-card-head">
        <h2 className="admin-card-title"><IcPhone size={16} /> Pipeline CRM</h2>
        <button type="button" className="admin-card-link" onClick={onGestionar}>
          Ver todos <IcChevronRight size={13} />
        </button>
      </div>
      <p className="admin-card-sub">Prospectos captados por el chatbot, clasificados por oportunidad</p>

      <div className="admin-pipeline-chart" aria-label="Distribución de prospectos por etapa">
        {etapas.map((etapa) => (
          <div key={etapa.nombre} className="admin-pipeline-stage">
            <div className="admin-pipeline-plot" aria-hidden="true">
              <span
                className="admin-pipeline-bar"
                style={{
                  height: etapa.cantidad > 0 ? `${Math.max(14, (etapa.cantidad / maximo) * 100)}%` : '2px',
                  backgroundColor: etapa.color,
                }}
              />
            </div>
            <strong className="admin-pipeline-count">{cargando ? '…' : etapa.cantidad}</strong>
            <div className="admin-pipeline-meta">
              <span className="admin-pipeline-label">
                <span className="admin-funnel-icon" style={{ color: etapa.color }}>{iconoEtapa(etapa.nombre)}</span>
                {etapa.nombre}
              </span>
              <span>{etapa.descripcion}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-crm-footer">
        <span>Conversión total: leads calificados a cerrados</span>
        <div className="admin-crm-conv">
          <div className="admin-crm-conv-track">
            <span className="admin-crm-conv-bar" style={{ width: `${Math.min(conversion, 100)}%` }} />
          </div>
          <strong>{conversion}%</strong>
        </div>
      </div>
    </section>
  )
}

export default PanelCrmAdmin
