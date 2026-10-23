import { useState } from 'react'
import { IcChat, IcCheck, IcNote, IcPhone, IcRefresh, IcUserCircle } from '@shared/ui/icons/icons'
import { enlaceTelefono, enlaceWhatsApp, plazoDe, respuestasRapidas } from '../model/bandejaPqrs'
import { ETIQUETAS_ESTADO, type ResponderSolicitudPqrsDto, type SolicitudPqrs } from '../model/solicitudPqrs'

type Props = {
  solicitud: SolicitudPqrs | null
  ahora: Date
  ocupada: boolean
  onTomar: (id: number) => Promise<boolean>
  onResponder: (id: number, datos: ResponderSolicitudPqrsDto, exito: string) => Promise<boolean>
}

const FECHA = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

function fecha(valor: string | null): string {
  if (!valor) return ''
  const instante = new Date(valor)
  return Number.isNaN(instante.getTime()) ? '' : FECHA.format(instante)
}

function PanelSolicitudPqrs({ solicitud, ahora, ocupada, onTomar, onResponder }: Props) {
  const [respuesta, setRespuesta] = useState(solicitud?.respuesta ?? '')

  if (!solicitud) {
    return (
      <aside className="sop-panel" aria-label="Detalle de la solicitud">
        <div className="sop-panel-cabecera">Detalle</div>
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
  const cambio = respuesta.trim() !== (solicitud.respuesta ?? '').trim()
  const editable = solicitud.estado === 'abierta' || solicitud.estado === 'en_proceso'

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
    <aside className="sop-panel" aria-label={`Solicitud ${solicitud.radicado}`}>
      <div className="sop-panel-cabecera">
        <span className="sop-panel-radicado">{solicitud.radicado}</span>
        <span className={`sop-estado sop-estado--${solicitud.estado}`}>{ETIQUETAS_ESTADO[solicitud.estado]}</span>
      </div>

      <div className="sop-panel-cuerpo">
        <div className="sop-panel-top">
          <span className="sop-panel-categoria">{solicitud.categoria}</span>
          <span className={`sop-plazo sop-plazo--${plazo.tono}`}>{plazo.texto}</span>
        </div>
        <h2 className="sop-panel-asunto">{solicitud.asunto || 'Sin asunto'}</h2>

        <blockquote className="sop-panel-mensaje">
          {solicitud.mensaje || 'El cliente no dejó un mensaje adicional.'}
        </blockquote>

        <dl className="sop-panel-meta">
          <div><dt>Cliente</dt><dd>{prospecto.nombre || 'Sin nombre'}</dd></div>
          <div><dt>Canal</dt><dd>{prospecto.canal_origen === 'whatsapp' ? 'WhatsApp' : prospecto.canal_origen === 'web' ? 'Web' : prospecto.canal_origen || 'No registrado'}</dd></div>
          <div><dt>Teléfono</dt><dd>{prospecto.telefono || 'No registrado'}</dd></div>
          <div><dt>Correo</dt><dd>{prospecto.email || 'No registrado'}</dd></div>
        </dl>

        {(telefono || whatsapp) && (
          <div className="sop-panel-contacto">
            {telefono && <a className="adm-btn adm-btn--secundario" href={telefono}><IcPhone size={16} aria-hidden="true" />Llamar</a>}
            {whatsapp && <a className="adm-btn adm-btn--secundario" href={whatsapp} target="_blank" rel="noreferrer"><IcChat size={16} aria-hidden="true" />WhatsApp</a>}
          </div>
        )}

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

        {solicitud.estado === 'abierta' && !solicitud.responsable ? (
          <button type="button" className="sop-accion" disabled={ocupada} onClick={() => void onTomar(solicitud.id)}>
            <IcUserCircle size={18} aria-hidden="true" />
            {ocupada ? 'Tomando…' : 'Tomar caso'}
          </button>
        ) : editable ? (
          <form
            className="sop-respuesta"
            onSubmit={(evento) => {
              evento.preventDefault()
              void guardar({ estado: 'resuelta', respuesta: respuesta.trim() }, 'Solicitud resuelta.')
            }}
          >
            <label className="sop-panel-subtitulo" htmlFor="sop-respuesta">Respuesta al cliente</label>
            <div className="sop-rapidas" aria-label="Respuestas rápidas">
              {respuestasRapidas(solicitud.categoria).map((texto) => (
                <button key={texto} type="button" className="sop-rapida" onClick={() => setRespuesta(texto)} title={texto}>{texto}</button>
              ))}
            </div>
            <textarea id="sop-respuesta" value={respuesta} onChange={(evento) => setRespuesta(evento.target.value)} rows={4} maxLength={4000} placeholder="Escribe lo que se le respondió o se hizo por el cliente." />
            <p className="sop-nota">Queda registrada en el caso. Comunícala al cliente por teléfono o WhatsApp.</p>
            <div className="sop-botones">
              <button type="button" className="adm-btn adm-btn--secundario" disabled={ocupada || !cambio || !respuesta.trim()} onClick={() => void guardar({ estado: 'en_proceso', respuesta: respuesta.trim() }, 'Avance guardado.')}>
                Guardar avance
              </button>
              <button type="submit" className="adm-btn adm-btn--primario" disabled={ocupada || !respuesta.trim()}>
                <IcCheck size={16} aria-hidden="true" />
                Marcar como resuelta
              </button>
            </div>
          </form>
        ) : (
          <div className="sop-respuesta">
            <p className="sop-panel-subtitulo">Respuesta registrada</p>
            <p className="sop-respuesta-final">{solicitud.respuesta || 'Sin respuesta registrada.'}</p>
            {solicitud.estado === 'resuelta' ? (
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
              <p className="sop-nota">Caso cerrado: ya no admite cambios.</p>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}

export default PanelSolicitudPqrs
