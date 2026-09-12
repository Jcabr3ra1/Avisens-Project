import TablaGestion, { type ColumnaGestion } from '@shared/ui/TablaGestion/TablaGestion'
import '@shared/ui/TablaGestion/TablaGestion.css'
import { PUNTAJE_MAXIMO, type ProspectoVista } from '../model/prospectoVista'
import { esIdentidadWhatsapp } from '../model/contacto'
import { ESTILO_ETAPA } from '../model/etapas'
import { urgenciaDe } from '../model/urgencia'
import { iniciales, metros } from '../model/formato'

type Props = {
  prospectos: ProspectoVista[]
  onAbrir: (prospecto: ProspectoVista) => void
}

const COLUMNAS: ColumnaGestion<ProspectoVista>[] = [
  {
    encabezado: 'Prospecto',
    render: (prospecto) => {
      const estilo = ESTILO_ETAPA[prospecto.etapa]
      return (
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
      )
    },
  },
  { encabezado: 'Granja', render: (prospecto) => prospecto.granja || '—' },
  { encabezado: 'Municipio', render: (prospecto) => prospecto.municipio || '—' },
  {
    encabezado: 'Área galpón',
    render: (prospecto) => (prospecto.areaGalponM2 > 0 ? metros(prospecto.areaGalponM2) : '—'),
  },
  {
    encabezado: 'Puntaje',
    render: (prospecto) => (
      <div className="crm-puntaje">
        <span className="crm-puntaje-num">{prospecto.puntaje}</span>
        <div className="crm-puntaje-barra-wrap">
          <div
            className={`crm-puntaje-barra crm-puntaje-barra--${prospecto.etapa}`}
            style={{ width: `${(prospecto.puntaje / PUNTAJE_MAXIMO) * 100}%` }}
          />
        </div>
      </div>
    ),
  },
  {
    encabezado: 'Días',
    render: (prospecto) => {
      const urgencia = urgenciaDe(prospecto.ultimaActividad, prospecto.etapa)
      return (
        <span className="crm-tabla-dias" style={{ color: urgencia.colorDias }}>
          {urgencia.etiqueta}
        </span>
      )
    },
  },
  {
    encabezado: 'Estado',
    render: (prospecto) => (
      <span className={`crm-estado-badge crm-estado-badge--${prospecto.etapa}`}>
        {ESTILO_ETAPA[prospecto.etapa].icono} {ESTILO_ETAPA[prospecto.etapa].label}
      </span>
    ),
  },
  {
    encabezado: 'Contacto',
    render: (prospecto) => (
      <>
        {esIdentidadWhatsapp(prospecto.telefono) ? (
          <span className="crm-canal-chip">Por WhatsApp</span>
        ) : (
          <span>{prospecto.telefono || '—'}</span>
        )}
        {prospecto.correo && (
          <>
            <br />
            <small>{prospecto.correo}</small>
          </>
        )}
      </>
    ),
  },
]

function TablaProspectos({ prospectos, onAbrir }: Props) {
  return (
    <TablaGestion
      items={prospectos}
      columnas={COLUMNAS}
      claveFila={(prospecto) => prospecto.id}
      cargando={false}
      mensajeVacio="Ningún prospecto coincide con el filtro."
      pistaVacio="Prueba cambiando la búsqueda, la etapa o el origen."
      filaClase={(prospecto) => `crm-fila--${prospecto.etapa}`}
      renderAcciones={(prospecto) => (
        <button
          type="button"
          className="tg-btn tg-btn--destacado"
          onClick={() => onAbrir(prospecto)}
        >
          Ver detalle
        </button>
      )}
    />
  )
}

export default TablaProspectos
