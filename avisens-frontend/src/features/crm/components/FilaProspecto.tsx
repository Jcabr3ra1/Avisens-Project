import { PUNTAJE_MAXIMO, type ProspectoVista } from '../model/prospectoVista'
import { ESTILO_ETAPA } from '../model/etapas'
import { urgenciaDe } from '../model/urgencia'
import { iniciales, metros } from '../model/formato'

type Props = {
  prospecto: ProspectoVista
  onAbrir: () => void
}

function FilaProspecto({ prospecto, onAbrir }: Props) {
  const estilo = ESTILO_ETAPA[prospecto.etapa]
  const urgencia = urgenciaDe(prospecto.ultimaActividad, prospecto.etapa)

  return (
    <tr className={`crm-fila crm-fila--${prospecto.etapa}`} onClick={onAbrir}>
      <td>
        <div className="crm-fila-nombre-wrap">
          <span className="crm-fila-avatar" style={{ background: estilo.color }}>
            {iniciales(prospecto.nombre)}
          </span>
          <div>
            <strong>{prospecto.nombre}</strong>
            <small className="crm-rol">{prospecto.rol}</small>
            <small className={`crm-canal-badge crm-canal-badge--${prospecto.canal}`}>
              {prospecto.canal === 'whatsapp' ? 'WhatsApp' : prospecto.canal === 'web' ? 'Web' : 'Otro'}
            </small>
          </div>
        </div>
      </td>
      <td>{prospecto.granja || '—'}</td>
      <td>{prospecto.municipio || '—'}</td>
      <td>{prospecto.areaGalponM2 > 0 ? metros(prospecto.areaGalponM2) : '—'}</td>
      <td>
        <div className="crm-puntaje">
          <span className="crm-puntaje-num">{prospecto.puntaje}</span>
          <div className="crm-puntaje-barra-wrap">
            <div
              className={`crm-puntaje-barra crm-puntaje-barra--${prospecto.etapa}`}
              style={{ width: `${(prospecto.puntaje / PUNTAJE_MAXIMO) * 100}%` }}
            />
          </div>
        </div>
      </td>
      <td>
        <span className="crm-tabla-dias" style={{ color: urgencia.colorDias }}>
          {urgencia.etiqueta}
        </span>
      </td>
      <td>
        <span className={`crm-estado-badge crm-estado-badge--${prospecto.etapa}`}>
          {estilo.icono} {estilo.label}
        </span>
      </td>
      <td>
        <span>{prospecto.telefono || '—'}</span>
        {prospecto.correo && (
          <>
            <br />
            <small>{prospecto.correo}</small>
          </>
        )}
      </td>
    </tr>
  )
}

export default FilaProspecto
