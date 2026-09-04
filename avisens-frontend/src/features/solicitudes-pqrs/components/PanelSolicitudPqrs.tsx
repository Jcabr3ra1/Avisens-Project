import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { mensajeDeError } from '@shared/utils/errores'
import { IcClose } from '@shared/ui/icons/icons'
import type { EstadoSolicitudPqrs, SolicitudPqrs } from '../model/solicitudPqrs'

type Props = {
  solicitud: SolicitudPqrs
  responsableId: number | undefined
  onCerrar: () => void
  onResponder: (id: number, datos: { estado: Exclude<EstadoSolicitudPqrs, 'abierta'>; respuesta?: string; responsable_id?: number }) => Promise<void>
  onEliminar: (id: number) => Promise<void>
}

function PanelSolicitudPqrs({ solicitud, responsableId, onCerrar, onResponder, onEliminar }: Props) {
  const [estado, setEstado] = useState<Exclude<EstadoSolicitudPqrs, 'abierta'>>(
    solicitud.estado === 'abierta' ? 'en_proceso' : solicitud.estado,
  )
  const [respuesta, setRespuesta] = useState(solicitud.respuesta ?? '')
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState(false)

  const contacto = solicitud.prospecto.nombre || solicitud.prospecto.telefono || solicitud.prospecto.email || 'Sin datos de contacto'

  useEffect(() => {
    const cerrarConEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !guardando && !eliminando) onCerrar()
    }

    window.addEventListener('keydown', cerrarConEscape)
    return () => window.removeEventListener('keydown', cerrarConEscape)
  }, [eliminando, guardando, onCerrar])

  const enviar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setGuardando(true)

    try {
      await onResponder(solicitud.id, {
        estado,
        respuesta: respuesta.trim() || undefined,
        responsable_id: responsableId,
      })
      onCerrar()
    } catch (error) {
      // Sin este aviso la respuesta al cliente se perdía en silencio: el
      // formulario se quedaba igual y parecía que no se había pulsado.
      toast.error(mensajeDeError(error, 'No se pudo guardar la respuesta.'))
      setGuardando(false)
    }
  }

  const eliminar = async () => {
    const confirmar = window.confirm('¿Seguro que deseas eliminar esta solicitud? Esta acción no se puede deshacer.')
    if (!confirmar) return

    setEliminando(true)
    try {
      await onEliminar(solicitud.id)
      onCerrar()
    } catch (error) {
      toast.error(mensajeDeError(error, 'No se pudo eliminar la solicitud.'))
      setEliminando(false)
    }
  }

  return (
    <div className="pqrs-modal" role="presentation" onMouseDown={onCerrar}>
      <section className="pqrs-panel" role="dialog" aria-modal="true" aria-labelledby="pqrs-detalle-titulo" onMouseDown={(event) => event.stopPropagation()}>
        <header className="pqrs-panel-cabecera">
          <div>
            <p className="pqrs-kicker">{solicitud.categoria}</p>
            <h2 id="pqrs-detalle-titulo">Solicitud de {contacto}</h2>
          </div>
          <button type="button" className="pqrs-cerrar" onClick={onCerrar} aria-label="Cerrar detalle de la solicitud">
            <IcClose size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="pqrs-panel-contenido">
          <dl className="pqrs-datos-contacto">
            <div><dt>Teléfono</dt><dd>{solicitud.prospecto.telefono || 'No registrado'}</dd></div>
            <div><dt>Correo</dt><dd>{solicitud.prospecto.email || 'No registrado'}</dd></div>
            <div><dt>Canal</dt><dd>{solicitud.prospecto.canal_origen || 'No registrado'}</dd></div>
          </dl>

          <div className="pqrs-mensaje">
            <h3>{solicitud.asunto || 'Sin asunto'}</h3>
            <p>{solicitud.mensaje || 'La persona no dejó un mensaje adicional.'}</p>
          </div>

          <form onSubmit={(event) => void enviar(event)}>
            <label className="pqrs-campo">
              <span>Estado</span>
              <select value={estado} onChange={(event) => setEstado(event.target.value as Exclude<EstadoSolicitudPqrs, 'abierta'>)}>
                <option value="en_proceso">En proceso</option>
                <option value="resuelta">Resuelta</option>
                <option value="cerrada">Cerrada</option>
              </select>
            </label>

            <label className="pqrs-campo">
              <span>Respuesta o nota interna</span>
              <textarea value={respuesta} onChange={(event) => setRespuesta(event.target.value)} rows={5} placeholder="Escribe cómo se atendió esta solicitud." />
            </label>

            <div className="pqrs-panel-acciones">
              <button type="button" className="pqrs-boton-peligro" onClick={() => void eliminar()} disabled={guardando || eliminando}>
                {eliminando ? 'Eliminando…' : 'Eliminar'}
              </button>
              <button type="submit" className="pqrs-boton-principal" disabled={guardando || eliminando}>
                {guardando ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}

export default PanelSolicitudPqrs
