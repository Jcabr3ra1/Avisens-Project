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
        <span className="admin-card-title"><IcPhone size={15} /> Pipeline CRM</span>
        <button type="button" className="admin-card-link" onClick={onGestionar}>
          Ver todos <IcChevronRight size={13} />
        </button>
      </div>
      <p className="admin-card-sub">Prospectos captados por el chatbot, por etapa</p>

      <div className="admin-funnel">
        {etapas.map((etapa) => (
          <div key={etapa.nombre} className="admin-funnel-row">
            <div className="admin-funnel-meta">
              <span className="admin-funnel-label">
                <span className="admin-funnel-icon" style={{ color: etapa.color }}>{iconoEtapa(etapa.nombre)}</span>
                {etapa.nombre}
              </span>
              <span className="admin-funnel-desc">{etapa.descripcion}</span>
            </div>
            <div className="admin-funnel-track">
              <div
                className="admin-funnel-bar"
                style={{
                  width: `${(etapa.cantidad / maximo) * 100}%`,
                  background: `linear-gradient(90deg, ${etapa.color}99, ${etapa.color})`,
                }}
              />
            </div>
            <span className="admin-funnel-count" style={{ color: etapa.color }}>
              {cargando ? '…' : etapa.cantidad}
            </span>
          </div>
        ))}
      </div>

      <div className="admin-crm-footer">
        <span>Conversión total: leads calificados a cerrados</span>
        <div className="admin-crm-conv">
          <div className="admin-crm-conv-track">
            <span className="admin-crm-conv-bar" style={{ width: `${conversion * 3}%` }} />
          </div>
          <strong>{conversion}%</strong>
        </div>
      </div>
    </section>
  )
}

export default PanelCrmAdmin
