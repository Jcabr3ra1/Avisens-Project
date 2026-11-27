import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { mensajeDeError } from '@shared/utils/errores'
import {
  IcArrowRight,
  IcCheck,
  IcClose,
  IcSend,
  IcSidebar,
  IcUserCircle,
} from '@shared/ui/icons/icons'
import {
  ETIQUETAS_ESTADO_RECUPERACION,
  type AprobacionRecuperacion,
  type RecuperacionPassword,
  type ResolverRecuperacionPayload,
} from '../model/recuperacionPassword'

type Props = {
  solicitud: RecuperacionPassword | null
  abiertoMovil: boolean
  onCerrarMovil: () => void
  onAprobar: (id: number, datos: ResolverRecuperacionPayload) => Promise<AprobacionRecuperacion>
  onRechazar: (id: number, datos: ResolverRecuperacionPayload) => Promise<void>
}

const FECHA_LARGA = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' })

function iniciales(nombre: string): string {
  return nombre.trim().split(/\s+/).slice(0, 2).map((parte) => parte[0]?.toUpperCase()).join('') || '—'
}

function formatearFecha(valor: string | null): string {
  if (!valor) return ''
  const fecha = new Date(valor)
  return Number.isNaN(fecha.getTime()) ? '' : FECHA_LARGA.format(fecha)
}

function PanelRecuperacion({
  solicitud,
  abiertoMovil,
  onCerrarMovil,
  onAprobar,
  onRechazar,
}: Props) {
  const [observacion, setObservacion] = useState(solicitud?.observacion ?? '')
  const [procesando, setProcesando] = useState(false)
  const [credencial, setCredencial] = useState<AprobacionRecuperacion | null>(null)

  useEffect(() => {
    if (!abiertoMovil) return
    const alPresionarTecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape' && !procesando) onCerrarMovil()
    }
    window.addEventListener('keydown', alPresionarTecla)
    return () => window.removeEventListener('keydown', alPresionarTecla)
  }, [abiertoMovil, onCerrarMovil, procesando])

  if (!solicitud) {
    return (
      <aside className="rec-inspector" aria-label="Solicitud seleccionada">
        <div className="rec-inspector-cabecera">
          <IcSidebar size={15} aria-hidden="true" />
          <span>Solicitud seleccionada</span>
        </div>
        <div className="rec-inspector-vacio">
          <IcUserCircle size={28} aria-hidden="true" />
          <p>Selecciona una solicitud de la lista para verificar a la persona y gestionar su acceso.</p>
        </div>
      </aside>
    )
  }

  const aprobar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setProcesando(true)
    try {
      setCredencial(await onAprobar(solicitud.id, { observacion: observacion.trim() || undefined }))
    } catch (error) {
      toast.error(mensajeDeError(error, 'No se pudo aprobar la solicitud.'))
    } finally {
      setProcesando(false)
    }
  }

  const rechazar = async () => {
    setProcesando(true)
    try {
      await onRechazar(solicitud.id, { observacion: observacion.trim() || undefined })
    } catch (error) {
      toast.error(mensajeDeError(error, 'No se pudo rechazar la solicitud.'))
    } finally {
      setProcesando(false)
    }
  }

  const copiar = async () => {
    if (!credencial) return
    try {
      await navigator.clipboard.writeText(credencial.password_temporal)
      toast.success('Contraseña temporal copiada')
    } catch {
      toast.error('No se pudo copiar la contraseña.')
    }
  }

  const pendiente = solicitud.estado === 'pendiente'
  const fechaCreacion = formatearFecha(solicitud.fecha_creacion)
  const fechaAtencion = formatearFecha(solicitud.atendida_en)

  return (
    <>
      {abiertoMovil && (
        <div
          className="rec-inspector-fondo"
          aria-hidden="true"
          onClick={() => { if (!procesando) onCerrarMovil() }}
        />
      )}
      <aside
        className={`rec-inspector${abiertoMovil ? ' is-abierto-movil' : ''}`}
        aria-label={`Solicitud #${solicitud.id} de ${solicitud.usuario.nombre_completo}`}
      >
        <div className="rec-inspector-cabecera">
          <IcSidebar size={15} aria-hidden="true" />
          <span>Solicitud #{solicitud.id}</span>
          <span className={`rec-estado rec-estado--${solicitud.estado}`}>
            {ETIQUETAS_ESTADO_RECUPERACION[solicitud.estado]}
          </span>
          <button
            type="button"
            className="rec-inspector-cerrar"
            onClick={() => { if (!procesando) onCerrarMovil() }}
            aria-label="Cerrar panel de la solicitud"
          >
            <IcClose size={17} aria-hidden="true" />
          </button>
        </div>

        <div className="rec-inspector-cuerpo">
          <header className="rec-inspector-identidad">
            <span className="rec-avatar rec-avatar--grande" aria-hidden="true">
              {iniciales(solicitud.usuario.nombre_completo)}
            </span>
            <div>
              <h2>{solicitud.usuario.nombre_completo}</h2>
              <p>
                <span>@{solicitud.usuario.username}</span>
                {fechaCreacion && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{fechaCreacion}</span>
                  </>
                )}
              </p>
            </div>
          </header>

          <div className="rec-inspector-enlaces">
            {solicitud.usuario.email && (
              <a className="rec-contacto-btn" href={`mailto:${solicitud.usuario.email}`}>
                <IcSend size={15} aria-hidden="true" />
                Correo
              </a>
            )}
            <Link className="rec-contacto-btn" to={`/usuarios?usuario=${solicitud.usuario.id}`}>
              <IcUserCircle size={15} aria-hidden="true" />
              Ver persona
              <IcArrowRight size={13} aria-hidden="true" />
            </Link>
          </div>

          <dl className="rec-datos">
            <div><dt>Documento</dt><dd>{solicitud.usuario.cedula}</dd></div>
            <div><dt>Correo</dt><dd>{solicitud.usuario.email || 'No registrado'}</dd></div>
            <div className="rec-datos-ancho"><dt>Motivo reportado</dt><dd>{solicitud.motivo || 'No indicó un motivo.'}</dd></div>
          </dl>

          {credencial ? (
            <section className="rec-credencial" aria-live="polite">
              <p>Contraseña temporal generada</p>
              <strong>{credencial.password_temporal}</strong>
              <span>
                Vence {formatearFecha(credencial.expira_en)}. Muéstrala una sola vez y compártela por un canal seguro.
              </span>
              <button className="rec-boton rec-boton--secundario" type="button" onClick={() => void copiar()}>
                Copiar contraseña
              </button>
            </section>
          ) : pendiente ? (
            <form id="rec-form-verificacion" className="rec-form-gestion" onSubmit={(event) => void aprobar(event)}>
              <label className="rec-campo" htmlFor="rec-observacion">
                <span>Nota de verificación <em>Opcional</em></span>
                <textarea
                  id="rec-observacion"
                  value={observacion}
                  onChange={(event) => setObservacion(event.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Por ejemplo: identidad confirmada por llamada."
                />
              </label>
              <p className="rec-ayuda">
                Al restablecer se cerrarán las sesiones activas y la persona deberá definir una contraseña nueva al ingresar.
              </p>
            </form>
          ) : (
            <section className="rec-detalle-final rec-detalle-final--caja">
              <p>Estado: <strong>{ETIQUETAS_ESTADO_RECUPERACION[solicitud.estado]}</strong></p>
              <p>Atendida por: <strong>{solicitud.atendida_por?.nombre_completo ?? 'No disponible'}</strong></p>
              {fechaAtencion && <p>Fecha de atención: <strong>{fechaAtencion}</strong></p>}
              {solicitud.observacion && <p>Nota: {solicitud.observacion}</p>}
            </section>
          )}
        </div>

        {pendiente && !credencial && (
          <footer className="rec-inspector-pie">
            <button
              className="rec-boton rec-boton--peligro"
              type="button"
              onClick={() => void rechazar()}
              disabled={procesando}
            >
              {procesando ? 'Procesando…' : 'Rechazar'}
            </button>
            <button
              className="rec-boton rec-boton--principal"
              type="submit"
              form="rec-form-verificacion"
              disabled={procesando}
            >
              <IcCheck size={16} aria-hidden="true" />
              {procesando ? 'Generando…' : 'Restablecer acceso'}
            </button>
          </footer>
        )}
      </aside>
    </>
  )
}

export default PanelRecuperacion
