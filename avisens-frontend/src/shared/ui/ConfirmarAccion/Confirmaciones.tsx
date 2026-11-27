import { useEffect, useId, useRef, useSyncExternalStore } from 'react'
import { useLocation } from 'react-router-dom'
import Modal from '@shared/ui/Modal/Modal'
import { IcAlert, IcTrash } from '@shared/ui/icons/icons'
import { gestorConfirmacion } from './gestorConfirmacion'
import './Confirmaciones.css'

/** Se mantiene montado durante la salida antes de resolver la confirmación. */
function Confirmaciones() {
  const solicitud = useSyncExternalStore(gestorConfirmacion.subscribe, gestorConfirmacion.getSnapshot)
  const cancelarRef = useRef<HTMLButtonElement>(null)
  const descripcionId = useId()
  const ubicacion = useLocation()

  useEffect(() => () => gestorConfirmacion.cancelarTodo(), [ubicacion.key])

  useEffect(() => {
    if (solicitud?.fase === 'abierta' && solicitud.error) cancelarRef.current?.focus()
  }, [solicitud?.fase, solicitud?.error])

  if (!solicitud) return null
  const { opciones, fase, error } = solicitud
  const ocupado = fase === 'procesando'
  const tono = opciones.tono ?? 'peligro'

  return (
    <Modal
      titulo={opciones.titulo}
      ancho="compacto"
      abierto={fase !== 'cerrando'}
      onCerrar={gestorConfirmacion.cancelar}
      onSalida={gestorConfirmacion.finalizarSalida}
      bloqueado={ocupado || fase === 'cerrando'}
      focoInicial={cancelarRef}
      descripcionId={descripcionId}
      icono={<span className={`confirmacion-icono confirmacion-icono--${tono}`}>
        {tono === 'peligro' ? <IcTrash size={22} /> : <IcAlert size={22} />}
      </span>}
      acciones={<>
        <button ref={cancelarRef} type="button" className="modal-btn" disabled={ocupado} onClick={gestorConfirmacion.cancelar}>
          Cancelar
        </button>
        <button
          type="button"
          className={`modal-btn confirmacion-confirmar confirmacion-confirmar--${tono}`}
          disabled={ocupado}
          onClick={() => { void gestorConfirmacion.confirmar() }}
        >
          {ocupado && <span className="confirmacion-espera" aria-hidden="true" />}
          {ocupado ? opciones.textoProcesando ?? 'Procesando…' : opciones.textoConfirmar}
        </button>
      </>}
    >
      {opciones.entidad && <p className="confirmacion-entidad">{opciones.entidad}</p>}
      <p id={descripcionId} className="confirmacion-descripcion">{opciones.descripcion}</p>
      {ocupado && <span className="confirmacion-estado" role="status">{opciones.textoProcesando ?? 'Procesando…'}</span>}
      {error && <p className="modal-error confirmacion-error" role="alert">{error}</p>}
    </Modal>
  )
}

export default Confirmaciones
