import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { mensajeDeError } from '@shared/utils/errores'
import Modal from '@shared/ui/Modal/Modal'
import type { EstadoSolicitudPqrs, SolicitudPqrs } from '../model/solicitudPqrs'

type Props = {
  solicitud: SolicitudPqrs
  responsableId: number | undefined
  onCerrar: () => void
  onResponder: (id: number, datos: { estado: Exclude<EstadoSolicitudPqrs, 'abierta'>; respuesta?: string; responsable_id?: number }) => Promise<void>
  onEliminar: (id: number) => Promise<void>
}

const ID_FORMULARIO = 'formulario-respuesta-pqrs'

function PanelSolicitudPqrs({ solicitud, responsableId, onCerrar, onResponder, onEliminar }: Props) {
  const [estado, setEstado] = useState<Exclude<EstadoSolicitudPqrs, 'abierta'>>(
    solicitud.estado === 'abierta' ? 'en_proceso' : solicitud.estado,
  )
  const [respuesta, setRespuesta] = useState(solicitud.respuesta ?? '')
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState(false)

  const contacto = solicitud.prospecto.nombre || solicitud.prospecto.telefono || solicitud.prospecto.email || 'Sin datos de contacto'

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
    <Modal
      titulo={`Solicitud de ${contacto}`}
      subtitulo={solicitud.categoria}
      onCerrar={onCerrar}
      ancho="ancho"
      acciones={(
        <>
          <button
            type="button"
            className="modal-btn modal-btn--danger pqrs-eliminar"
            onClick={() => void eliminar()}
            disabled={guardando || eliminando}
          >
            {eliminando ? 'Eliminando…' : 'Eliminar solicitud'}
          </button>
          <button type="button" className="modal-btn" onClick={onCerrar} disabled={guardando || eliminando}>
            Cancelar
          </button>
          <button type="submit" form={ID_FORMULARIO} className="modal-btn modal-btn--primary" disabled={guardando || eliminando}>
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </>
      )}
    >
      <dl className="pqrs-datos-contacto">
        <div><dt>Teléfono</dt><dd>{solicitud.prospecto.telefono || 'No registrado'}</dd></div>
        <div><dt>Correo</dt><dd>{solicitud.prospecto.email || 'No registrado'}</dd></div>
        <div><dt>Canal</dt><dd>{solicitud.prospecto.canal_origen || 'No registrado'}</dd></div>
      </dl>

      <div className="pqrs-mensaje">
        <h3>{solicitud.asunto || 'Sin asunto'}</h3>
        <p>{solicitud.mensaje || 'La persona no dejó un mensaje adicional.'}</p>
      </div>

      <form id={ID_FORMULARIO} className="pqrs-form" onSubmit={(event) => void enviar(event)}>
        <label className="modal-campo">
          <span>Estado</span>
          <select value={estado} onChange={(event) => setEstado(event.target.value as Exclude<EstadoSolicitudPqrs, 'abierta'>)}>
            <option value="en_proceso">En proceso</option>
            <option value="resuelta">Resuelta</option>
            <option value="cerrada">Cerrada</option>
          </select>
        </label>

        <label className="modal-campo">
          <span>Respuesta o nota interna <em>(Opcional)</em></span>
          <textarea value={respuesta} onChange={(event) => setRespuesta(event.target.value)} rows={5} placeholder="Describe cómo se atendió esta solicitud." />
        </label>
      </form>
    </Modal>
  )
}

export default PanelSolicitudPqrs
