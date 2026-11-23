import { useState, type FormEvent } from 'react'
import { IcBuilding } from '@shared/ui/icons/icons'
import Modal from '@shared/ui/Modal/Modal'
import { mensajeDeError } from '@shared/utils/errores'
import { validarNit, validarNombreEntidad } from '@shared/utils/validacion'
import type { CrearOrganizacionPayload, Organizacion } from '../api/organizaciones'

const PLANES_PERMITIDOS = [
  { valor: 'free', etiqueta: 'Free (gratuito)' },
  { valor: 'basic', etiqueta: 'Basic' },
  { valor: 'pro', etiqueta: 'Pro' },
  { valor: 'enterprise', etiqueta: 'Enterprise' },
] as const

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
    const errorNombre = validarNombreEntidad(nombre, 'El nombre de la organización', { max: 150 })
    if (errorNombre) {
      setError(errorNombre)
      return
    }
    const errorNit = validarNit(nit)
    if (errorNit) {
      setError(errorNit)
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
      variante="lateral"
      icono={<IcBuilding size={20} />}
      titulo={editando ? 'Editar cliente' : 'Nuevo cliente'}
      subtitulo="Actualiza los datos principales del cliente. De él dependen sus usuarios y granjas."
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
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={150} required autoFocus autoComplete="organization" />
        </label>

        <label className="modal-campo">
          <span>NIT <em>(Opcional)</em></span>
          <input value={nit} onChange={(e) => setNit(e.target.value)} maxLength={15} placeholder="Ej.: 900123456-7" />
          <small className="modal-ayuda">Debe ser único: 6 a 10 dígitos y dígito de verificación opcional.</small>
        </label>

        <label className="modal-campo">
          <span>Plan</span>
          <select value={plan} onChange={(e) => setPlan(e.target.value)}>
            {PLANES_PERMITIDOS.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>
            ))}
            {planesConocidos
              .filter((p) => !PLANES_PERMITIDOS.some((op) => op.valor === p))
              .map((extra) => (
                <option key={extra} value={extra}>{extra}</option>
              ))}
          </select>
        </label>

        {error && <p className="modal-error" role="alert">{error}</p>}
      </form>
    </Modal>
  )
}

export default FormularioOrganizacion
