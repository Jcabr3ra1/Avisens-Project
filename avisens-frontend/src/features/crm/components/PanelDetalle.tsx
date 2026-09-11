import Modal from '@shared/ui/Modal/Modal'
import type { Usuario } from '@shared/api'
import { IcPhone, IcPlus } from '@shared/ui/icons/icons'
import {
  PUNTAJE_MAXIMO,
  RANGOS_PUNTAJE,
  type ProspectoVista,
} from '../model/prospectoVista'
import { ESTILO_ETAPA } from '../model/etapas'
import { urgenciaDe } from '../model/urgencia'
import { pesos } from '../model/formato'
import { useCotizaciones } from '../hooks/useCotizaciones'
import { useSolicitudesDeProspecto } from '@features/solicitudes-pqrs/hooks/useSolicitudesDeProspecto'
import { ETIQUETAS_ESTADO } from '@features/solicitudes-pqrs/model/solicitudPqrs'

type Props = {
  prospecto: ProspectoVista
  asesores: Usuario[]
  asignando: boolean
  onAsignar: (asesorId: number) => void
  onCerrar: () => void
}

function PanelDetalle({ prospecto, asesores, asignando, onAsignar, onCerrar }: Props) {
  const estilo = ESTILO_ETAPA[prospecto.etapa]
  const urgencia = urgenciaDe(prospecto.ultimaActividad, prospecto.etapa)
  const { cotizaciones, cargando, generando, generar } = useCotizaciones(
    prospecto.id,
  )
  const {
    solicitudes,
    cargando: cargandoSolicitudes,
    atendiendo,
    error: errorSolicitudes,
    atender,
  } = useSolicitudesDeProspecto(prospecto.id)

  return (
    <Modal
      titulo={prospecto.nombre}
      subtitulo={prospecto.rol}
      onCerrar={onCerrar}
      ancho="ancho"
      acciones={prospecto.telefono || prospecto.correo ? (
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
      ) : undefined}
    >
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

          <div className="crm-det-row">
            <span className="crm-det-lbl">Origen</span>
            <span className={`crm-canal-badge crm-canal-badge--${prospecto.canal}`}>
              {prospecto.canal === 'whatsapp' ? 'WhatsApp' : prospecto.canal === 'web' ? 'Web' : 'Otro'}
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
            <label className="crm-det-lbl" htmlFor="crm-asesor">Quién lo atiende</label>
            <select
              id="crm-asesor"
              className="crm-det-asesor"
              value={prospecto.asesorId ?? ''}
              disabled={asignando || asesores.length === 0}
              onChange={(evento) => {
                if (evento.target.value) onAsignar(Number(evento.target.value))
              }}
            >
              <option value="">{asignando ? 'Asignando…' : 'Sin asignar'}</option>
              {/* Solo se ofrecen administradores: el prospecto lo atiende
                  alguien del equipo de Avisens, no un cliente. */}
              {asesores.map((asesor) => (
                <option key={asesor.id} value={asesor.id}>{asesor.nombre_completo}</option>
              ))}
            </select>
          </div>

          <div className="crm-det-sep" />

          <div className="crm-det-cotiza-head">
            <p className="crm-det-section">Cotizaciones</p>
            <button
              className="crm-det-btn-generar"
              type="button"
              onClick={() => void generar()}
              disabled={generando || cargando}
            >
              <IcPlus size={13} />
              {generando ? 'Generando…' : 'Generar'}
            </button>
          </div>

          {cargando ? (
            <p className="crm-det-cotiza-vacio">Cargando cotizaciones…</p>
          ) : cotizaciones.length === 0 ? (
            <p className="crm-det-cotiza-vacio">
              Este prospecto aún no tiene cotizaciones.
            </p>
          ) : (
            <ul className="crm-det-cotizaciones">
              {cotizaciones.map((cotizacion) => (
                <li key={cotizacion.id} className="crm-det-cotiza">
                  <div className="crm-det-cotiza-linea">
                    <strong>{cotizacion.codigo ?? `COT #${cotizacion.id}`}</strong>
                    <span>{pesos(cotizacion.valor_total_cop)}</span>
                  </div>
                  <div className="crm-det-cotiza-meta">
                    {cotizacion.plan_recomendado && (
                      <span className="crm-det-cotiza-plan">
                        {cotizacion.plan_recomendado}
                      </span>
                    )}
                    {cotizacion.numero_galpones !== null && (
                      <span>{cotizacion.numero_galpones} galpón(es)</span>
                    )}
                    <span>
                      {new Intl.DateTimeFormat('es-CO', {
                        day: 'numeric',
                        month: 'short',
                      }).format(new Date(cotizacion.fecha_generacion))}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="crm-det-sep" />

          <p className="crm-det-section">Solicitudes PQRS</p>

          {errorSolicitudes && (
            <p className="crm-det-cotiza-vacio">{errorSolicitudes}</p>
          )}

          {cargandoSolicitudes ? (
            <p className="crm-det-cotiza-vacio">Cargando solicitudes…</p>
          ) : solicitudes.length === 0 ? (
            <p className="crm-det-cotiza-vacio">
              Este prospecto no tiene solicitudes PQRS.
            </p>
          ) : (
            <ul className="crm-det-cotizaciones">
              {solicitudes.map((solicitud) => (
                <li key={solicitud.id} className="crm-det-cotiza">
                  <div className="crm-det-cotiza-linea">
                    <strong>{solicitud.asunto ?? solicitud.categoria}</strong>
                    <span>{ETIQUETAS_ESTADO[solicitud.estado]}</span>
                  </div>
                  <div className="crm-det-cotiza-meta">
                    <span>{solicitud.categoria}</span>
                    <span>
                      {new Intl.DateTimeFormat('es-CO', {
                        day: 'numeric',
                        month: 'short',
                      }).format(new Date(solicitud.fecha_creacion))}
                    </span>
                    {solicitud.estado !== 'resuelta' &&
                      solicitud.estado !== 'cerrada' && (
                        <>
                          {solicitud.estado === 'abierta' && (
                            <button
                              className="crm-det-btn-generar"
                              type="button"
                              disabled={atendiendo}
                              onClick={() =>
                                void atender(solicitud.id, 'en_proceso')
                              }
                            >
                              Atender
                            </button>
                          )}
                          <button
                            className="crm-det-btn-generar"
                            type="button"
                            disabled={atendiendo}
                            onClick={() =>
                              void atender(solicitud.id, 'resuelta')
                            }
                          >
                            Resolver
                          </button>
                        </>
                      )}
                  </div>
                  {solicitud.respuesta && (
                    <div className="crm-det-cotiza-meta">
                      <span>{solicitud.respuesta}</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

    </Modal>
  )
}

export default PanelDetalle
