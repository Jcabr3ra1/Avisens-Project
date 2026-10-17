import * as Tooltip from '@radix-ui/react-tooltip'
import { IcCheck, IcChevronRight, IcFlame, IcSnowflake, IcThermo } from '@shared/ui/icons/icons'
import { ESTILO_ETAPA } from '@features/crm/model/etapas'
import { iniciales } from '@features/crm/model/formato'
import { hace, type EtapaCrmAdmin, type ProspectoReciente } from '../model/adminResumen'

type Props = {
  etapas: EtapaCrmAdmin[]
  recientes: ProspectoReciente[]
  total: number
  cargando: boolean
  conversion: number
  onGestionar: () => void
  onAbrirProspecto: (id: number) => void
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

function PanelCrmAdmin({
  etapas,
  recientes,
  total,
  cargando,
  conversion,
  onGestionar,
  onAbrirProspecto,
}: Props) {
  return (
    <section className="admin-card admin-crm" aria-label="Resumen de prospectos CRM">
      <div className="admin-card-head">
        <div>
          <h2 className="admin-card-title">Pipeline CRM</h2>
          <p className="admin-card-sub">
            Prospectos captados por el chatbot según temperatura comercial
          </p>
        </div>
        <button type="button" className="admin-card-link" onClick={onGestionar}>
          Ver embudo <IcChevronRight size={13} />
        </button>
      </div>

      <div className="admin-card-body">
        <div className="admin-crm-summary" aria-label="Distribución de prospectos por etapa">
          <div className="admin-crm-summary-head">
            <span>
              <strong>{cargando ? '…' : total}</strong>{' '}
              {total === 1 ? 'prospecto registrado' : 'prospectos registrados'}
            </span>
            <span className="admin-crm-conversion-pill">
              Conversión: <strong>{cargando ? '…' : `${conversion}%`}</strong>
            </span>
          </div>

          <div className={`admin-role-chart${total === 0 ? ' admin-role-chart--empty' : ''}`}>
            {etapas
              .filter((etapa) => etapa.cantidad > 0)
              .map((etapa) => {
                const porcentaje = total > 0 ? Math.round((etapa.cantidad / total) * 100) : 0
                return (
                  <Tooltip.Root key={etapa.nombre}>
                    <Tooltip.Trigger asChild>
                      <span
                        className="admin-role-segment"
                        style={{ flexGrow: etapa.cantidad, backgroundColor: etapa.color }}
                        aria-label={`${etapa.nombre}: ${etapa.cantidad} (${porcentaje}%)`}
                      />
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content className="admin-tooltip" side="top" sideOffset={6}>
                        {etapa.nombre}: {etapa.cantidad} de {total} ({porcentaje}%) · {etapa.descripcion}
                        <Tooltip.Arrow className="admin-tooltip-arrow" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                )
              })}
          </div>

          <div className="admin-crm-stages">
            {etapas.map((etapa) => (
              <button
                key={etapa.nombre}
                type="button"
                className="admin-crm-stage-chip"
                onClick={onGestionar}
                title={`${etapa.nombre} — ${etapa.descripcion}`}
              >
                <span className="admin-crm-stage-name">
                  <span className="admin-funnel-icon" style={{ color: etapa.color }}>
                    {iconoEtapa(etapa.nombre)}
                  </span>
                  {etapa.nombre}
                </span>
                <strong>{cargando ? '…' : etapa.cantidad}</strong>
              </button>
            ))}
          </div>
        </div>

        <div className="admin-crm-recientes">
          <div className="admin-crm-recientes-head">
            <span>Últimos posibles clientes</span>
            <span>Etapa</span>
            <span>Registro</span>
          </div>
          {recientes.length === 0 ? (
            <p className="admin-feed-vacio">
              {cargando ? 'Cargando…' : 'Aún no hay posibles clientes captados por el chatbot.'}
            </p>
          ) : (
            <ul className="admin-feed">
              {recientes.map((prospecto) => {
                const estilo = ESTILO_ETAPA[prospecto.etapa]
                return (
                  <li key={prospecto.id}>
                    <button
                      type="button"
                      className="admin-feed-row"
                      onClick={() => onAbrirProspecto(prospecto.id)}
                    >
                      <span className="admin-feed-person">
                        <span className="admin-feed-avatar" aria-hidden="true">
                          {iniciales(prospecto.nombre)}
                        </span>
                        <span className="admin-feed-info">
                          <span className="admin-feed-nombre">{prospecto.nombre}</span>
                          <span className="admin-feed-meta">
                            {prospecto.contacto} · {prospecto.canal}
                          </span>
                        </span>
                      </span>

                      <span className="admin-feed-badge-col">
                        <span
                          className="admin-crm-etapa"
                          style={{
                            color: estilo.color,
                            background: estilo.colorSuave,
                            borderColor: estilo.colorBorde,
                          }}
                        >
                          {estilo.label}
                        </span>
                      </span>

                      <time className="admin-feed-hace" dateTime={prospecto.fechaRegistro}>
                        {hace(prospecto.fechaRegistro)}
                      </time>

                      <IcChevronRight size={14} className="admin-feed-arrow" aria-hidden="true" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      <footer className="admin-attention-footer">
        <button type="button" className="admin-attention-shortcut" onClick={onGestionar}>
          Abrir embudo comercial <IcChevronRight size={12} />
        </button>
      </footer>
    </section>
  )
}

export default PanelCrmAdmin
