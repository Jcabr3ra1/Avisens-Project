import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import Modal from '@shared/ui/Modal/Modal'
import { IcAlert } from '@shared/ui/icons/icons'
import { mensajeDeError } from '@shared/utils/errores'
import {
  eliminarOrganizacionDefinitivo,
  obtenerImpactoEliminacion,
  type ImpactoEliminacion,
} from '../api/organizaciones'
import './EliminarOrganizacion.css'

type Props = {
  organizacionId: number
  nombre: string
  onEliminada: () => void
  onCerrar: () => void
}

const CONTEOS: Array<{ clave: Exclude<keyof ImpactoEliminacion, 'organizacion'>; singular: string; plural: string }> = [
  { clave: 'usuarios', singular: 'persona con acceso', plural: 'personas con acceso' },
  { clave: 'granjas', singular: 'granja', plural: 'granjas' },
  { clave: 'galpones', singular: 'galpón', plural: 'galpones' },
  { clave: 'lotes', singular: 'lote', plural: 'lotes' },
  { clave: 'dispositivos', singular: 'controlador', plural: 'controladores' },
  { clave: 'sensores', singular: 'sensor', plural: 'sensores' },
  { clave: 'mediciones', singular: 'medición', plural: 'mediciones' },
  { clave: 'registros', singular: 'registro de bitácora', plural: 'registros de bitácora' },
  { clave: 'alertas', singular: 'alerta', plural: 'alertas' },
]

function EliminarOrganizacion({ organizacionId, nombre, onEliminada, onCerrar }: Props) {
  const [impacto, setImpacto] = useState<ImpactoEliminacion | null>(null)
  const [errorCarga, setErrorCarga] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [eliminando, setEliminando] = useState(false)
  const [error, setError] = useState('')
  const coincide = confirmacion.trim() === nombre.trim()

  useEffect(() => {
    let vigente = true
    void obtenerImpactoEliminacion(organizacionId)
      .then((respuesta) => { if (vigente) setImpacto(respuesta) })
      .catch((problema) => { if (vigente) setErrorCarga(mensajeDeError(problema, 'No se pudo calcular lo que se borraría.')) })
    return () => { vigente = false }
  }, [organizacionId])

  async function eliminar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!coincide || !impacto) return
    setEliminando(true)
    setError('')
    try {
      await eliminarOrganizacionDefinitivo(organizacionId, confirmacion)
      toast.success(`${nombre} fue eliminada`)
      onEliminada()
    } catch (problema) {
      setError(mensajeDeError(problema, 'No se pudo eliminar la organización.'))
      setEliminando(false)
    }
  }

  return (
    <Modal
      titulo="Eliminar organización"
      subtitulo="Esta acción no se puede deshacer."
      onCerrar={eliminando ? () => undefined : onCerrar}
      acciones={(
        <>
          <button type="button" className="modal-btn" onClick={onCerrar} disabled={eliminando}>Cancelar</button>
          <button type="submit" form="eliminar-organizacion" className="modal-btn elim-boton" disabled={!coincide || !impacto || eliminando}>
            {eliminando ? 'Eliminando…' : 'Eliminar para siempre'}
          </button>
        </>
      )}
    >
      <form id="eliminar-organizacion" className="elim" onSubmit={(evento) => void eliminar(evento)}>
        <div className="elim-aviso" role="note">
          <IcAlert size={20} aria-hidden="true" />
          <p>Se borrará <strong>{nombre}</strong> con todo lo que contiene. Sus personas perderán el acceso y sus datos no se podrán recuperar. La auditoría conserva el registro de esta acción.</p>
        </div>

        <section aria-label="Lo que se borrará">
          <h3 className="elim-subtitulo">Lo que se borrará</h3>
          {errorCarga ? (
            <p className="elim-error" role="alert">{errorCarga}</p>
          ) : !impacto ? (
            <ul className="elim-conteos" aria-hidden="true">
              {CONTEOS.slice(0, 6).map((conteo) => <li key={conteo.clave} className="elim-conteo-esqueleto org-brilla" />)}
            </ul>
          ) : (
            <ul className="elim-conteos">
              {CONTEOS.map(({ clave, singular, plural }) => {
                const valor = impacto[clave]
                return (
                  <li key={clave} className={valor > 0 ? 'is-con-datos' : undefined}>
                    <strong>{valor.toLocaleString('es-CO')}</strong>
                    <span>{valor === 1 ? singular : plural}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <label className="elim-confirmar">
          <span>Para confirmar, escribe <strong>{nombre}</strong></span>
          <input
            value={confirmacion}
            onChange={(evento) => setConfirmacion(evento.target.value)}
            autoComplete="off"
            spellCheck={false}
            data-lpignore="true"
            aria-invalid={confirmacion !== '' && !coincide}
            disabled={eliminando}
          />
        </label>
        {error && <p className="elim-error" role="alert">{error}</p>}
      </form>
    </Modal>
  )
}

export default EliminarOrganizacion
