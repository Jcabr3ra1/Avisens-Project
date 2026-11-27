import type { CSSProperties } from 'react'
import IconoFigma from '@shared/ui/icons/IconoFigma'
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

function PanelCrmAdmin({ etapas, recientes, total, cargando, conversion, onGestionar, onAbrirProspecto }: Props) {
  return (
    <section className="cdc-panel cdc-entra" style={{ '--i': 8 } as CSSProperties} aria-labelledby="cdc-crm-titulo">
      <header className="cdc-panel-cabecera">
        <div>
          <h2 id="cdc-crm-titulo">Embudo comercial</h2>
          <p>Prospectos que llegan por el chatbot, según su temperatura</p>
        </div>
        <button type="button" className="cdc-enlace" onClick={onGestionar}>
          Abrir CRM <IconoFigma nombre="flecha-derecha" tamano={14} />
        </button>
      </header>

      <div className="cdc-resumen-linea">
        <span><strong>{cargando ? '–' : total}</strong> {total === 1 ? 'prospecto' : 'prospectos'}</span>
        <span className="cdc-resumen-dato">Conversión <strong>{cargando ? '–' : `${conversion} %`}</strong></span>
      </div>

      <ul className="cdc-embudo" aria-label="Prospectos por etapa">
        {etapas.map((etapa) => {
          const porcentaje = total === 0 ? 0 : Math.round((etapa.cantidad / total) * 100)
          return (
            <li key={etapa.nombre}>
              <button
                type="button"
                className={etapa.cantidad === 0 ? 'is-cero' : undefined}
                onClick={onGestionar}
                title={`${etapa.descripcion} · ${porcentaje} %`}
                aria-label={`${etapa.nombre}: ${etapa.cantidad} de ${total} (${porcentaje} %). Abrir CRM`}
              >
                <span className="cdc-embudo-nombre">{etapa.nombre}</span>
                <span className="cdc-embudo-pista" aria-hidden="true">
                  <span
                    className="cdc-embudo-barra"
                    style={{ width: `${cargando ? 0 : porcentaje}%`, background: etapa.color }}
                  />
                </span>
                <strong>{cargando ? '–' : etapa.cantidad}</strong>
              </button>
            </li>
          )
        })}
      </ul>

      <h3 className="cdc-subtitulo">Últimos posibles clientes</h3>
      {recientes.length === 0 ? (
        <p className="cdc-nota">{cargando ? 'Cargando…' : 'Aún no hay posibles clientes captados por el chatbot.'}</p>
      ) : (
        <ul className="cdc-personas">
          {recientes.map((prospecto) => {
            const estilo = ESTILO_ETAPA[prospecto.etapa]
            return (
              <li key={prospecto.id}>
                <button type="button" className="cdc-persona" onClick={() => onAbrirProspecto(prospecto.id)}>
                  <span className="cdc-persona-avatar" aria-hidden="true">{iniciales(prospecto.nombre)}</span>
                  <span className="cdc-persona-texto">
                    <strong>{prospecto.nombre}</strong>
                    <small>{prospecto.contacto} · {prospecto.canal}</small>
                  </span>
                  <span className="cdc-insignia" style={{ color: estilo.color, background: estilo.colorSuave, borderColor: estilo.colorBorde }}>
                    {estilo.label}
                  </span>
                  <time dateTime={prospecto.fechaRegistro}>{hace(prospecto.fechaRegistro)}</time>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default PanelCrmAdmin
