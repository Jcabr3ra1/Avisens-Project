import { IcClock, IcHome, IcPhone, IcPin } from '@shared/ui/icons/icons'
import type { ProspectoVista } from '../model/prospectoVista'
import { ESTILO_ETAPA } from '../model/etapas'
import { urgenciaDe } from '../model/urgencia'
import { iniciales, metros } from '../model/formato'
import ScoreDonut from './ScoreDonut'

type Props = {
  prospecto: ProspectoVista
  onAbrir: () => void
}

function TarjetaProspecto({ prospecto, onAbrir }: Props) {
  const estilo = ESTILO_ETAPA[prospecto.etapa]
  const urgencia = urgenciaDe(prospecto.ultimaActividad, prospecto.etapa)

  return (
    <div
      className={`crm-kcard crm-kcard--${urgencia.nivel}`}
      style={{ borderLeftColor: urgencia.colorBorde }}
      role="button"
      tabIndex={0}
      onClick={onAbrir}
      onKeyDown={(e) => e.key === 'Enter' && onAbrir()}
    >
      <div className="crm-kcard-head">
        <span className="crm-kcard-avatar" style={{ background: estilo.color }}>
          {iniciales(prospecto.nombre)}
        </span>
        <div className="crm-kcard-ident">
          <span className="crm-kcard-nombre">{prospecto.nombre}</span>
          <span className="crm-kcard-granja">{prospecto.granja}</span>
          <span className={`crm-canal-badge crm-canal-badge--${prospecto.canal}`}>
            {prospecto.canal === 'whatsapp' ? 'WhatsApp' : prospecto.canal === 'web' ? 'Web' : 'Otro'}
          </span>
        </div>
        {prospecto.puntaje > 0 && (
          <ScoreDonut puntaje={prospecto.puntaje} color={estilo.color} />
        )}
      </div>

      <div className="crm-kcard-body">
        <span className="crm-kcard-muni">
          <IcPin size={11} /> {prospecto.municipio}
        </span>

        {prospecto.areaGalponM2 > 0 && (
          <div className="crm-kcard-stats">
            <span className="crm-kcard-stat">
              <IcHome size={11} /> {metros(prospecto.areaGalponM2)} galpón
            </span>
          </div>
        )}
      </div>

      <div className="crm-kcard-footer">
        <span className="crm-kcard-dias" style={{ color: urgencia.colorDias }}>
          <IcClock size={11} /> {urgencia.etiqueta}
        </span>
        {prospecto.telefono && (
          <a
            className="crm-kcard-call"
            href={`tel:${prospecto.telefono}`}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Llamar a ${prospecto.nombre}`}
          >
            <IcPhone size={11} /> Llamar
          </a>
        )}
      </div>
    </div>
  )
}

export default TarjetaProspecto
