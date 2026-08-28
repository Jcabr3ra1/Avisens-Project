import { ETAPAS, type ProspectoVista } from '../model/prospectoVista'
import { ESTILO_ETAPA } from '../model/etapas'
import TarjetaProspecto from './TarjetaProspecto'

type Props = {
  prospectos: ProspectoVista[]
  onAbrir: (prospecto: ProspectoVista) => void
}

function TableroKanban({ prospectos, onAbrir }: Props) {
  return (
    <div className="crm-kanban">
      {ETAPAS.map((etapa) => {
        const estilo = ESTILO_ETAPA[etapa]
        const columna = prospectos.filter((p) => p.etapa === etapa)

        return (
          <div
            key={etapa}
            className={`crm-kanban-lane crm-kanban-lane--${etapa}`}
            style={{ borderLeftColor: estilo.color }}
          >
            <div className="crm-kanban-head">
              <span className="crm-kanban-head-emoji">{estilo.icono}</span>
              <span className="crm-kanban-head-title">{estilo.label}</span>
              <span
                className="crm-kanban-count"
                style={{ background: estilo.colorSuave, color: estilo.color }}
              >
                {columna.length}
              </span>
            </div>

            <div className="crm-kanban-body">
              {columna.length === 0 ? (
                <div className="crm-kanban-vacio">
                  <p>Sin prospectos</p>
                </div>
              ) : (
                columna.map((prospecto) => (
                  <TarjetaProspecto
                    key={prospecto.id}
                    prospecto={prospecto}
                    onAbrir={() => onAbrir(prospecto)}
                  />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default TableroKanban
