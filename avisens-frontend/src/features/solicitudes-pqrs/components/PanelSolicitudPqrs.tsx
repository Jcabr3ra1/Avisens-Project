import { useEffect, useState } from 'react'
import {
  IcChat,
  IcCheck,
  IcClose,
  IcNote,
  IcPhone,
  IcRefresh,
  IcSend,
  IcUserCircle,
} from '@shared/ui/icons/icons'
import { enlaceTelefono, enlaceWhatsApp, plazoDe, respuestasRapidas } from '../model/bandejaPqrs'
import { ETIQUETAS_ESTADO, type ResponderSolicitudPqrsDto, type SolicitudPqrs } from '../model/solicitudPqrs'

type PestanaPqrs = 'atencion' | 'seguimiento'

type Props = {
  solicitud: SolicitudPqrs | null
  ahora: Date
  ocupada: boolean
  abiertoMovil: boolean
  onCerrarMovil: () => void
  onTomar: (id: number) => Promise<boolean>
  onResponder: (id: number, datos: ResponderSolicitudPqrsDto, exito: string) => Promise<boolean>
}

const FECHA = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

function fecha(valor: string | null): string {
  if (!valor) return ''
  const instante = new Date(valor)
  return Number.isNaN(instante.getTime()) ? '' : FECHA.format(instante)
}

function PanelSolicitudPqrs({
  solicitud,
  ahora,
  ocupada,
  abiertoMovil,
  onCerrarMovil,
  onTomar,
  onResponder,
}: Props) {
  const [respuesta, setRespuesta] = useState(solicitud?.respuesta ?? '')
  const [pestana, setPestana] = useState<PestanaPqrs>('atencion')

  useEffect(() => {
    if (!abiertoMovil) return
    const alPresionarTecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') onCerrarMovil()
    }
    window.addEventListener('keydown', alPresionarTecla)
    return () => window.removeEventListener('keydown', alPresionarTecla)
  }, [abiertoMovil, onCerrarMovil])

  if (!solicitud) {
    return (
      <aside className="sop-panel" aria-label="Detalle de la solicitud">
        <div className="sop-panel-cabecera">
          <span>Detalle</span>
        </div>
        <div className="sop-panel-vacio">
          <IcNote size={26} aria-hidden="true" />
          <p>Elige una solicitud de la bandeja para atenderla.</p>
        </div>
      </aside>
    )
  }

  const plazo = plazoDe(solicitud, ahora)
  const { prospecto } = solicitud
  const telefono = enlaceTelefono(prospecto.telefono)
  const whatsapp = enlaceWhatsApp(prospecto.telefono)
  const correo = prospecto.email ? `mailto:${prospecto.email}` : null
  const cambio = respuesta.trim() !== (solicitud.respuesta ?? '').trim()
  const editable = solicitud.estado === 'abierta' || solicitud.estado === 'en_proceso'
  const sinTomar = solicitud.estado === 'abierta' && !solicitud.responsable

  const pasos = [
    { titulo: 'Radicada', detalle: fecha(solicitud.fecha_creacion), hecho: true },
    { titulo: solicitud.responsable ? `A cargo de ${solicitud.responsable.nombre_completo}` : 'Sin responsable', detalle: '', hecho: solicitud.responsable !== null },
    { titulo: 'Resuelta', detalle: fecha(solicitud.fecha_cierre), hecho: solicitud.estado === 'resuelta' || solicitud.estado === 'cerrada' },
    { titulo: 'Cerrada', detalle: '', hecho: solicitud.estado === 'cerrada' },
  ]

  async function guardar(datos: ResponderSolicitudPqrsDto, exito: string) {
    if (!solicitud) return
    await onResponder(solicitud.id, datos, exito)
  }

  return (
    <>
      {abiertoMovil && (
        <div
          className="sop-panel-fondo"
          aria-hidden="true"
          onClick={onCerrarMovil}
        />
      )}
      <aside
        className={`sop-panel${abiertoMovil ? ' is-abierto-movil' : ''}`}
        aria-label={`Solicitud ${solicitud.radicado}`}
      >
        <div className="sop-panel-cabecera">
          <span className="sop-panel-radicado">{solicitud.radicado}</span>
          <span className={`sop-estado sop-estado--${solicitud.estado}`}>{ETIQUETAS_ESTADO[solicitud.estado]}</span>
          <button
            type="button"
            className="sop-panel-cerrar"
            onClick={onCerrarMovil}
            aria-label="Cerrar panel de la solicitud"
          >
            <IcClose size={17} aria-hidden="true" />
          </button>
        </div>

        <div className="sop-panel-encabezado">
          <div className="sop-panel-top">
            <span className="sop-panel-categoria">{solicitud.categoria}</span>
            <span className={`sop-plazo sop-plazo--${plazo.tono}`}>{plazo.texto}</span>
          </div>
          <h2 className="sop-panel-asunto">{solicitud.asunto || 'Sin asunto'}</h2>
          <p className="sop-panel-cliente">
            <strong>{prospecto.nombre || 'Cliente sin nombre'}</strong>
            <span aria-hidden="true">·</span>
            <span>{prospecto.canal_origen === 'whatsapp' ? 'WhatsApp' : prospecto.canal_origen === 'web' ? 'Web' : prospecto.canal_origen || 'Otro canal'}</span>
          </p>

          {(telefono || whatsapp || correo) && (
            <div className="sop-panel-contacto">
              {telefono && <a className="sop-contacto-btn" href={telefono}><IcPhone size={15} aria-hidden="true" />Llamar</a>}
              {whatsapp && <a className="sop-contacto-btn" href={whatsapp} target="_blank" rel="noreferrer"><IcChat size={15} aria-hidden="true" />WhatsApp</a>}
              {correo && <a className="sop-contacto-btn" href={correo}><IcSend size={15} aria-hidden="true" />Correo</a>}
            </div>
          )}

          <nav className="sop-panel-tabs" role="tablist" aria-label="Secciones de la solicitud">
            <button
              type="button"
              role="tab"
              aria-selected={pestana === 'atencion'}
              className={`sop-panel-tab${pestana === 'atencion' ? ' is-activa' : ''}`}
              onClick={() => setPestana('atencion')}
            >
              Atención
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={pestana === 'seguimiento'}
              className={`sop-panel-tab${pestana === 'seguimiento' ? ' is-activa' : ''}`}
              onClick={() => setPestana('seguimiento')}
            >
              Cliente y seguimiento
            </button>
          </nav>
        </div>

        <div className="sop-panel-cuerpo">
          {pestana === 'atencion' ? (
            <>
              <section className="sop-bloque">
                <p className="sop-panel-subtitulo">Mensaje del cliente</p>
                <blockquote className="sop-panel-mensaje">
                  {solicitud.mensaje || 'El cliente no dejó un mensaje adicional.'}
                </blockquote>
              </section>

              {sinTomar ? (
                <p className="sop-nota-caja">
                  Toma este caso para quedar a cargo y redactar la respuesta al cliente.
                </p>
              ) : editable ? (
                <form
                  id="sop-form-respuesta"
                  className="sop-respuesta"
                  onSubmit={(evento) => {
                    evento.preventDefault()
                    if (!respuesta.trim()) return
                    void guardar({ estado: 'resuelta', respuesta: respuesta.trim() }, 'Solicitud resuelta.')
                  }}
                >
                  <label className="sop-panel-subtitulo" htmlFor="sop-respuesta">Respuesta al cliente</label>
                  <div className="sop-rapidas" aria-label="Respuestas rápidas">
                    {respuestasRapidas(solicitud.categoria).map((texto) => (
                      <button key={texto} type="button" className="sop-rapida" onClick={() => setRespuesta(texto)} title={texto}>{texto}</button>
                    ))}
                  </div>
                  <textarea
                    id="sop-respuesta"
                    value={respuesta}
                    onChange={(evento) => setRespuesta(evento.target.value)}
                    rows={4}
                    maxLength={4000}
                    placeholder="Escribe lo que se le respondió o se hizo por el cliente."
                  />
                  <p className="sop-nota">Queda registrada en el caso. Comunícala al cliente por teléfono o WhatsApp.</p>
                </form>
              ) : (
                <section className="sop-bloque">
                  <p className="sop-panel-subtitulo">Respuesta registrada</p>
                  <p className="sop-respuesta-final">{solicitud.respuesta || 'Sin respuesta registrada.'}</p>
                </section>
              )}
            </>
          ) : (
            <>
              <section className="sop-bloque">
                <p className="sop-panel-subtitulo">Datos de contacto</p>
                <dl className="sop-panel-meta">
                  <div><dt>Cliente</dt><dd>{prospecto.nombre || 'Sin nombre'}</dd></div>
                  <div><dt>Canal</dt><dd>{prospecto.canal_origen === 'whatsapp' ? 'WhatsApp' : prospecto.canal_origen === 'web' ? 'Web' : prospecto.canal_origen || 'No registrado'}</dd></div>
                  <div><dt>Teléfono</dt><dd>{prospecto.telefono || 'No registrado'}</dd></div>
                  <div><dt>Correo</dt><dd>{prospecto.email || 'No registrado'}</dd></div>
                </dl>
              </section>

              <section className="sop-bloque">
                <p className="sop-panel-subtitulo">Seguimiento</p>
                <ol className="sop-linea">
                  {pasos.map((paso) => (
                    <li key={paso.titulo} className={paso.hecho ? 'is-hecho' : undefined}>
                      <span className="sop-linea-punto" aria-hidden="true">{paso.hecho && <IcCheck size={12} />}</span>
                      <span className="sop-linea-texto">{paso.titulo}</span>
                      {paso.detalle && <time className="sop-linea-fecha">{paso.detalle}</time>}
                    </li>
                  ))}
                </ol>
              </section>
            </>
          )}
        </div>

        <footer className="sop-panel-pie">
          {sinTomar ? (
            <button type="button" className="sop-accion" disabled={ocupada} onClick={() => void onTomar(solicitud.id)}>
              <IcUserCircle size={18} aria-hidden="true" />
              {ocupada ? 'Tomando…' : 'Tomar caso'}
            </button>
          ) : editable ? (
            <div className="sop-botones">
              <button
                type="button"
                className="adm-btn adm-btn--secundario"
                disabled={ocupada || !cambio || !respuesta.trim()}
                onClick={() => void guardar({ estado: 'en_proceso', respuesta: respuesta.trim() }, 'Avance guardado.')}
              >
                Guardar avance
              </button>
              <button
                type="button"
                className="adm-btn adm-btn--primario"
                disabled={ocupada || !respuesta.trim()}
                onClick={() => void guardar({ estado: 'resuelta', respuesta: respuesta.trim() }, 'Solicitud resuelta.')}
              >
                <IcCheck size={16} aria-hidden="true" />
                Marcar resuelta
              </button>
            </div>
          ) : solicitud.estado === 'resuelta' ? (
            <div className="sop-botones">
              <button type="button" className="adm-btn adm-btn--secundario" disabled={ocupada} onClick={() => void guardar({ estado: 'en_proceso' }, 'El caso se reabrió.')}>
                <IcRefresh size={16} aria-hidden="true" />
                Reabrir
              </button>
              <button type="button" className="adm-btn adm-btn--primario" disabled={ocupada} onClick={() => void guardar({ estado: 'cerrada' }, 'Caso cerrado.')}>
                <IcCheck size={16} aria-hidden="true" />
                Cerrar caso
              </button>
            </div>
          ) : (
            <p className="sop-nota sop-nota--cerrada">Caso cerrado: ya no admite cambios.</p>
          )}
        </footer>
      </aside>
    </>
  )
}

export default PanelSolicitudPqrs
