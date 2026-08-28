import { IcClose, IcPhone } from '@shared/ui/icons/icons'
import {
  PUNTAJE_MAXIMO,
  RANGOS_PUNTAJE,
  type ProspectoVista,
} from '../model/prospectoVista'
import { ESTILO_ETAPA } from '../model/etapas'
import { urgenciaDe } from '../model/urgencia'
import { iniciales } from '../model/formato'

type Props = {
  prospecto: ProspectoVista
  onCerrar: () => void
}

function PanelDetalle({ prospecto, onCerrar }: Props) {
  const estilo = ESTILO_ETAPA[prospecto.etapa]
  const urgencia = urgenciaDe(prospecto.ultimaActividad, prospecto.etapa)

  return (
    <div className="crm-overlay" onClick={onCerrar}>
      <aside className="crm-detalle" onClick={(e) => e.stopPropagation()}>
        <div className="crm-detalle-head" style={{ borderBottomColor: estilo.color }}>
          <span className="crm-detalle-avatar" style={{ background: estilo.color }}>
            {iniciales(prospecto.nombre)}
          </span>
          <div className="crm-detalle-ident">
            <h2 className="crm-detalle-nombre">{prospecto.nombre}</h2>
            <span className="crm-detalle-rol">{prospecto.rol}</span>
          </div>
          <button className="crm-detalle-cerrar" onClick={onCerrar} aria-label="Cerrar">
            <IcClose size={17} />
          </button>
        </div>

        <div className="crm-detalle-body">
          <div className="crm-det-row">
            <span className="crm-det-lbl">Estado</span>
            <span
              className="crm-det-badge"
              style={{
                background: estilo.colorSuave,
                color: estilo.color,
                border: `1px solid ${estilo.colorBorde}`,
              }}
            >
              {estilo.icono} {estilo.label}
            </span>
          </div>

          {prospecto.puntaje > 0 && (
            <div className="crm-det-row">
              <span className="crm-det-lbl">Puntaje</span>
              <div className="crm-det-score-wrap">
                <strong style={{ color: estilo.color }}>{prospecto.puntaje}</strong>
                <span className="crm-det-score-max"> / {PUNTAJE_MAXIMO}</span>
                <span className="crm-det-score-rango">
                  · {RANGOS_PUNTAJE[prospecto.etapa]}
                </span>
              </div>
            </div>
          )}

          <div className="crm-det-row">
            <span className="crm-det-lbl">Último contacto</span>
            <span style={{ color: urgencia.colorDias, fontWeight: 600, fontSize: '0.84rem' }}>
              {urgencia.etiqueta === 'Hoy' ? 'Hoy' : `Hace ${urgencia.etiqueta}`}
            </span>
          </div>

          <div className="crm-det-sep" />

          <p className="crm-det-section">Granja</p>
          <div className="crm-det-row">
            <span className="crm-det-lbl">Nombre</span>
            <span className="crm-det-val">{prospecto.granja || '—'}</span>
          </div>
          <div className="crm-det-row">
            <span className="crm-det-lbl">Municipio</span>
            <span className="crm-det-val">{prospecto.municipio || '—'}</span>
          </div>
          {prospecto.areaGalponM2 > 0 && (
            <div className="crm-det-row">
              <span className="crm-det-lbl">Área del galpón</span>
              <span className="crm-det-val">
                {prospecto.areaGalponM2.toLocaleString('es-CO')} m²
              </span>
            </div>
          )}

          <div className="crm-det-sep" />

          <p className="crm-det-section">Contacto</p>
          <div className="crm-det-row">
            <span className="crm-det-lbl">Teléfono</span>
            {prospecto.telefono ? (
              <a href={`tel:${prospecto.telefono}`} className="crm-det-link">
                {prospecto.telefono}
              </a>
            ) : (
              <span className="crm-det-val">—</span>
            )}
          </div>
          {prospecto.correo && (
            <div className="crm-det-row">
              <span className="crm-det-lbl">Correo</span>
              <a
                href={`mailto:${prospecto.correo}`}
                className="crm-det-link crm-det-link--truncate"
              >
                {prospecto.correo}
              </a>
            </div>
          )}
          <div className="crm-det-row">
            <span className="crm-det-lbl">Asesor</span>
            <span className="crm-det-val">
              {prospecto.asesorId ? `Asesor #${prospecto.asesorId}` : 'Sin asignar'}
            </span>
          </div>
        </div>

        <div className="crm-detalle-acciones">
          {prospecto.telefono && (
            <a href={`tel:${prospecto.telefono}`} className="crm-det-btn crm-det-btn--primary">
              <IcPhone size={15} /> Llamar ahora
            </a>
          )}
          {prospecto.correo && (
            <a href={`mailto:${prospecto.correo}`} className="crm-det-btn crm-det-btn--ghost">
              Enviar correo
            </a>
          )}
        </div>
      </aside>
    </div>
  )
}

export default PanelDetalle
