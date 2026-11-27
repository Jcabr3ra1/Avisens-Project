import { useRef, useState, type FormEvent } from 'react'
import Modal from '@shared/ui/Modal/Modal'
import { mensajeDeError } from '@shared/utils/errores'
import './EliminarProspecto.css'

type Props = {
  nombre: string
  onEliminar: (confirmacion: string) => Promise<void>
  onEliminado: () => void
  onCerrar: () => void
}

export default function EliminarProspecto({ nombre, onEliminar, onEliminado, onCerrar }: Props) {
  const [confirmacion, setConfirmacion] = useState('')
  const [eliminando, setEliminando] = useState(false)
  const [error, setError] = useState('')
  const enviando = useRef(false)
  const coincide = confirmacion.trim() === 'ELIMINAR'

  async function eliminar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!coincide || enviando.current) return
    enviando.current = true
    setEliminando(true)
    setError('')
    try {
      await onEliminar(confirmacion.trim())
      onEliminado()
    } catch (problema) {
      setError(mensajeDeError(problema, 'No se pudo eliminar el prospecto. Inténtalo de nuevo.'))
      enviando.current = false
      setEliminando(false)
    }
  }

  return (
    <Modal
      titulo="Eliminar prospecto"
      subtitulo="Esta acción no se puede deshacer."
      onCerrar={eliminando ? () => undefined : onCerrar}
      acciones={(
        <>
          <button type="button" className="modal-btn" onClick={onCerrar} disabled={eliminando}>Cancelar</button>
          <button type="submit" form="eliminar-prospecto" className="modal-btn modal-btn--danger" disabled={!coincide || eliminando}>
            {eliminando ? 'Eliminando…' : 'Eliminar prospecto'}
          </button>
        </>
      )}
    >
      <form id="eliminar-prospecto" className="pros-eliminacion" onSubmit={(evento) => void eliminar(evento)} aria-busy={eliminando}>
        <p>Vas a eliminar a <strong>{nombre}</strong> y su historial asociado:</p>
        <ul>
          <li>Respuestas y conversaciones del chatbot.</li>
          <li>Cotizaciones y sus detalles de sensores.</li>
          <li>Solicitudes PQRS vinculadas a este prospecto.</li>
        </ul>
        <p>Si ya es cliente, su organización, granjas y usuarios se conservan.</p>
        <label className="pros-eliminacion-confirmar">
          <span id="pros-eliminar-ayuda">Escribe <strong>ELIMINAR</strong> para confirmar.</span>
          <input
            value={confirmacion}
            onChange={(evento) => setConfirmacion(evento.target.value)}
            disabled={eliminando}
            autoComplete="off"
            spellCheck={false}
            aria-label="Confirmación de eliminación"
            aria-describedby="pros-eliminar-ayuda"
          />
        </label>
        {error && <p className="pros-eliminacion-error" role="alert">{error}</p>}
      </form>
    </Modal>
  )
}
