import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { mensajeDeError } from '@shared/utils/errores'
import { IcClose } from '@shared/ui/icons/icons'
import type {
  AprobacionRecuperacion,
  RecuperacionPassword,
  ResolverRecuperacionPayload,
} from '../model/recuperacionPassword'

type Props = {
  solicitud: RecuperacionPassword
  onCerrar: () => void
  onAprobar: (id: number, datos: ResolverRecuperacionPayload) => Promise<AprobacionRecuperacion>
  onRechazar: (id: number, datos: ResolverRecuperacionPayload) => Promise<void>
}

function PanelRecuperacion({ solicitud, onCerrar, onAprobar, onRechazar }: Props) {
  const [observacion, setObservacion] = useState(solicitud.observacion ?? '')
  const [procesando, setProcesando] = useState(false)
  const [credencial, setCredencial] = useState<AprobacionRecuperacion | null>(null)

  useEffect(() => {
    const cerrarConEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !procesando) onCerrar()
    }
    window.addEventListener('keydown', cerrarConEscape)
    return () => window.removeEventListener('keydown', cerrarConEscape)
  }, [onCerrar, procesando])

  const aprobar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setProcesando(true)
    try {
      setCredencial(await onAprobar(solicitud.id, { observacion: observacion.trim() || undefined }))
    } catch (error) {
      toast.error(mensajeDeError(error, 'No se pudo aprobar la solicitud.'))
      setProcesando(false)
    }
  }

  const rechazar = async () => {
    setProcesando(true)
    try {
      await onRechazar(solicitud.id, { observacion: observacion.trim() || undefined })
      onCerrar()
    } catch (error) {
      toast.error(mensajeDeError(error, 'No se pudo rechazar la solicitud.'))
      setProcesando(false)
    }
  }

  const copiar = async () => {
    if (!credencial) return
    await navigator.clipboard.writeText(credencial.password_temporal)
  }

  const pendiente = solicitud.estado === 'pendiente'

  return (
    <div className="rec-modal" role="presentation" onMouseDown={onCerrar}>
      <section className="rec-panel" role="dialog" aria-modal="true" aria-labelledby="rec-panel-titulo" onMouseDown={(event) => event.stopPropagation()}>
        <header className="rec-panel-cabecera">
          <div>
            <p className="rec-kicker">Solicitud #{solicitud.id}</p>
            <h2 id="rec-panel-titulo">{solicitud.usuario.nombre_completo}</h2>
          </div>
          <button className="rec-cerrar" type="button" onClick={onCerrar} aria-label="Cerrar detalle de la recuperación" disabled={procesando}>
            <IcClose size={20} aria-hidden="true" />
          </button>
        </header>
        <div className="rec-panel-contenido">
          <dl className="rec-datos">
            <div><dt>Correo</dt><dd>{solicitud.usuario.email}</dd></div>
            <div><dt>Documento</dt><dd>{solicitud.usuario.cedula}</dd></div>
            <div><dt>Motivo</dt><dd>{solicitud.motivo || 'No indicó un motivo.'}</dd></div>
          </dl>

          {credencial ? (
            <section className="rec-credencial" aria-live="polite">
              <p>Contraseña temporal</p>
              <strong>{credencial.password_temporal}</strong>
              <span>Vence {new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(credencial.expira_en))}. Muéstrala una sola vez y compártela mediante un canal seguro.</span>
              <button className="rec-boton rec-boton--secundario" type="button" onClick={() => void copiar()}>Copiar contraseña</button>
            </section>
          ) : pendiente ? (
            <form className="rec-form-gestion" onSubmit={(event) => void aprobar(event)}>
              <label className="rec-campo" htmlFor="rec-observacion">
                <span>Nota de verificación <em>Opcional</em></span>
                <textarea id="rec-observacion" value={observacion} onChange={(event) => setObservacion(event.target.value)} maxLength={500} rows={4} placeholder="Por ejemplo: identidad confirmada por llamada." />
              </label>
              <p className="rec-ayuda">Al restablecer se cerrarán las sesiones activas y la persona deberá definir una contraseña nueva al ingresar.</p>
              <div className="rec-panel-acciones">
                <button className="rec-boton rec-boton--peligro" type="button" onClick={() => void rechazar()} disabled={procesando}>{procesando ? 'Procesando…' : 'Rechazar'}</button>
                <button className="rec-boton rec-boton--principal" type="submit" disabled={procesando}>{procesando ? 'Generando acceso…' : 'Restablecer acceso'}</button>
              </div>
            </form>
          ) : (
            <section className="rec-detalle-final">
              <p>Estado: <strong>{solicitud.estado}</strong></p>
              <p>Atendida por: <strong>{solicitud.atendida_por?.nombre_completo ?? 'No disponible'}</strong></p>
              {solicitud.observacion && <p>Nota: {solicitud.observacion}</p>}
            </section>
          )}
        </div>
      </section>
    </div>
  )
}

export default PanelRecuperacion
