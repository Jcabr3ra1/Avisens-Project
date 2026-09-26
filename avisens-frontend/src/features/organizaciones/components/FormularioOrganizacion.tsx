import { useState, type FormEvent } from 'react'
import Modal from '@shared/ui/Modal/Modal'
import { mensajeDeError } from '@shared/utils/errores'
import type { CrearOrganizacionPayload, Organizacion } from '../api/organizaciones'

type Props = {
  editando: Organizacion | null
  planesConocidos: string[]
  onGuardar: (payload: CrearOrganizacionPayload, editandoId: number | null) => Promise<void>
  onCerrar: () => void
}

const ID_FORMULARIO = 'formulario-organizacion'

function FormularioOrganizacion({ editando, planesConocidos, onGuardar, onCerrar }: Props) {
  const [nombre, setNombre] = useState(editando?.nombre ?? '')
  const [nit, setNit] = useState(editando?.nit ?? '')
  const [plan, setPlan] = useState(editando?.plan ?? 'free')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!nombre.trim()) {
      setError('El nombre de la organización es obligatorio.')
      return
    }

    const payload: CrearOrganizacionPayload = { nombre: nombre.trim() }
    if (nit.trim()) payload.nit = nit.trim()
    if (plan.trim()) payload.plan = plan.trim()

    setGuardando(true)
    setError('')
    try {
      await onGuardar(payload, editando?.id ?? null)
      onCerrar()
    } catch (problema) {
      setError(mensajeDeError(problema, 'No se pudo guardar la organización.'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      titulo={editando ? 'Editar organización' : 'Nueva organización'}
      subtitulo="Una organización es una empresa cliente. De ella cuelgan sus usuarios y sus granjas."
      onCerrar={onCerrar}
      acciones={
        <>
          <button type="button" className="modal-btn" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </button>
          <button type="submit" form={ID_FORMULARIO} className="modal-btn modal-btn--primary" disabled={guardando}>
            {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear organización'}
          </button>
        </>
      }
    >
      <form id={ID_FORMULARIO} onSubmit={(evento) => void enviar(evento)}>
        <label className="modal-campo">
          <span>Nombre o razón social</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required autoFocus autoComplete="organization" />
        </label>

        <label className="modal-campo">
          <span>NIT <em>(Opcional)</em></span>
          <input value={nit} onChange={(e) => setNit(e.target.value)} />
          <small className="modal-ayuda">Debe ser único: no puede repetirse entre organizaciones.</small>
        </label>

        <label className="modal-campo">
          <span>Plan</span>
          <input value={plan} onChange={(e) => setPlan(e.target.value)} list="planes-conocidos" />
          {/* El backend guarda `plan` como texto libre y todavía no hay una
              escala definida, así que se sugieren los ya usados en vez de
              inventar niveles que después habría que desmontar. */}
          <datalist id="planes-conocidos">
            {planesConocidos.map((conocido) => <option key={conocido} value={conocido} />)}
          </datalist>
          <small className="modal-ayuda">
            Se sugieren los planes ya en uso. Todavía no hay una escala cerrada.
          </small>
        </label>

        {error && <p className="modal-error" role="alert">{error}</p>}
      </form>
    </Modal>
  )
}

export default FormularioOrganizacion
