import Modal from '@shared/ui/Modal/Modal'
import { useState } from 'react'
import { getUsuario, type Usuario } from '@shared/api'
import FormularioConversion from './FormularioConversion'
import type { ProspectoDetalle } from '../api/prospectos'
import type { FormularioConversion as DatosConversion } from '../model/conversion'
import { IcChevronRight, IcPhone, IcPlus } from '@shared/ui/icons/icons'
import {
  PUNTAJE_MAXIMO,
  RANGOS_PUNTAJE,
  type ProspectoVista,
} from '../model/prospectoVista'
import { ESTILO_ETAPA } from '../model/etapas'
import { urgenciaDe } from '../model/urgencia'
import {
  esIdentidadWhatsapp,
  etiquetaContacto,
  sePuedeLlamar,
} from '../model/contacto'
import { pesos } from '../model/formato'
import { useCotizaciones } from '../hooks/useCotizaciones'
import { useSolicitudesDeProspecto } from '@features/solicitudes-pqrs/hooks/useSolicitudesDeProspecto'
import { ETIQUETAS_ESTADO } from '@features/solicitudes-pqrs/model/solicitudPqrs'

type Props = {
  prospecto: ProspectoVista
  onConvertir: (form: DatosConversion) => Promise<unknown>
  asesores: Usuario[]
  asignando: boolean
  onAsignar: (asesorId: number) => void
  onCerrar: () => void
}

function PanelDetalle({ prospecto, asesores, asignando, onAsignar, onConvertir, onCerrar }: Props) {
  const [cambiandoAsesor, setCambiandoAsesor] = useState(false)
  const [convirtiendo, setConvirtiendo] = useState(false)
  // Un prospecto cerrado ya no se convierte: el backend lo rechaza con un 400,
  // así que ofrecerlo sería prometer algo que va a fallar.
  const yaCerrado = prospecto.etapa === 'cerrado' || prospecto.etapa === 'descartado'
  const asesorAsignado = asesores.find((asesor) => asesor.id === prospecto.asesorId) ?? null
  const esMio = asesorAsignado !== null && asesorAsignado.id === getUsuario()?.id
  // Puede haber prospecto asignado a alguien que ya no sale en la lista: un
  // usuario desactivado, o un propietario de antes de restringir los asesores
  // a administradores. Decirlo es mejor que mostrar «Sin asignar», que es
  // falso y haría que alguien lo tomara creyendo que está libre.
  const asignadoDesconocido = prospecto.asesorId !== null && asesorAsignado === null
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
      acciones={(
        <div className="crm-detalle-acciones">
          {/* Sin botón de llamar cuando el contacto es una identidad de
              WhatsApp: `tel:CO.1639…` abre el marcador con basura. */}
          {sePuedeLlamar(prospecto.telefono) && (
            <a href={`tel:${prospecto.telefono}`} className="crm-det-btn crm-det-btn--ghost">
              <IcPhone size={15} /> Llamar
            </a>
          )}
          {prospecto.correo && (
            <a href={`mailto:${prospecto.correo}`} className="crm-det-btn crm-det-btn--ghost">
              Correo
            </a>
          )}
        </div>
      )}
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

          {/* Cerrar la venta vivía en el pie del panel, debajo de Cotizaciones
              y PQRS: había que bajar hasta el fondo para encontrarlo. Va aquí,
              pegado al estado y al puntaje, que es lo que el asesor mira para
              decidir si esta persona ya merece el paso. Y dice lo que hace:
              nadie adivinaba que el botón crea una cuenta.

              El subtítulo nombra lo que `convertir()` crea: organización,
              granja y usuario. La granja es obligatoria en el formulario
              porque sin ella el cliente no tiene dónde colgar galpones. */}
          {!yaCerrado && (
            <button
              type="button"
              className="crm-det-convertir"
              onClick={() => setConvirtiendo(true)}
            >
              <span className="crm-det-convertir-txt">
                <strong>Convertir en cliente</strong>
                <span>Crea la organización, su granja y el usuario de acceso</span>
              </span>
              <IcChevronRight size={17} />
            </button>
          )}

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
            <span className="crm-det-lbl">{etiquetaContacto(prospecto.telefono)}</span>
            {sePuedeLlamar(prospecto.telefono) ? (
              <a href={`tel:${prospecto.telefono}`} className="crm-det-link">
                {prospecto.telefono}
              </a>
            ) : esIdentidadWhatsapp(prospecto.telefono) ? (
              /* El identificador NO se muestra: es un id interno de Meta que
                 solo sirve por la API. Nadie puede escribirlo en WhatsApp para
                 buscar a esta persona, así que enseñarlo solo ocupa sitio y
                 parece un dato roto. El sistema lo conserva para responder. */
              <span className="crm-det-val">Sin número</span>
            ) : (
              <span className="crm-det-val">—</span>
            )}
          </div>
          {esIdentidadWhatsapp(prospecto.telefono) && (
            <p className="crm-det-nota">
              Escribió por WhatsApp sin compartir su número, así que no se le puede
              llamar. Para responderle, busca su conversación en el WhatsApp de
              Avisens.
            </p>
          )}
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
          {/* Ya asignado se afirma, no se pregunta: un desplegable permanente
              se lee como «esto sigue pendiente» aunque tenga un nombre dentro.
              Para cambiarlo hay que pedirlo, que además evita reasignar sin
              querer al rozar la rueda del ratón sobre el campo. */}
          {(asesorAsignado || asignadoDesconocido) && !cambiandoAsesor ? (
            <div className="crm-det-row">
              <span className="crm-det-lbl">Lo atiende</span>
              <span className="crm-det-val">
                <strong>
                  {asignadoDesconocido
                    ? 'Alguien que ya no está disponible'
                    : esMio
                      ? 'Tú'
                      : asesorAsignado?.nombre_completo}
                </strong>
                <button
                  type="button"
                  className="crm-det-cambiar"
                  onClick={() => setCambiandoAsesor(true)}
                  disabled={asignando}
                >
                  Cambiar
                </button>
              </span>
            </div>
          ) : (
            <div className="crm-det-row">
              <label className="crm-det-lbl" htmlFor="crm-asesor">Quién lo atiende</label>
              <select
                id="crm-asesor"
                className="crm-det-asesor"
                value={prospecto.asesorId ?? ''}
                disabled={asignando || asesores.length === 0}
                onChange={(evento) => {
                  if (evento.target.value) {
                    onAsignar(Number(evento.target.value))
                    setCambiandoAsesor(false)
                  }
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
          )}

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

      {convirtiendo && (
        <FormularioConversion
          prospecto={prospecto as unknown as ProspectoDetalle}
          onConvertir={onConvertir}
          onCerrar={() => setConvirtiendo(false)}
        />
      )}
    </Modal>
  )
}

export default PanelDetalle
