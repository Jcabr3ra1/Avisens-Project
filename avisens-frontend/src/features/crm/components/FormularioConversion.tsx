import { useState, type FormEvent } from 'react'
import Modal from '@shared/ui/Modal/Modal'
import { mensajeDeError } from '@shared/utils/errores'
import type { ProspectoDetalle } from '../api/prospectos'
import {
  campoSenalado,
  contrasenaSugerida,
  errorDeConversion,
  prellenarDesde,
  type FormularioConversion as Datos,
} from '../model/conversion'

type Props = {
  prospecto: ProspectoDetalle
  onConvertir: (form: Datos) => Promise<unknown>
  onCerrar: () => void
}

const ID_FORMULARIO = 'formulario-convertir-prospecto'

function FormularioConversion({ prospecto, onConvertir, onCerrar }: Props) {
  const [form, setForm] = useState<Datos>(() => prellenarDesde(prospecto))
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [campoConflicto, setCampoConflicto] = useState<keyof Datos | null>(null)

  function cambiar<K extends keyof Datos>(campo: K, valor: Datos[K]) {
    setForm((actual) => ({ ...actual, [campo]: valor }))
    // Al corregir el campo señalado se quita la marca: dejarla puesta haría
    // pensar que sigue repetido cuando ya se cambió.
    if (campoConflicto === campo) setCampoConflicto(null)
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const problema = errorDeConversion(form)
    if (problema) {
      setError(problema)
      return
    }
    setGuardando(true)
    setError('')
    try {
      await onConvertir(form)
      onCerrar()
    } catch (problemaAlConvertir) {
      const mensaje = mensajeDeError(problemaAlConvertir, 'No se pudo convertir el prospecto.')
      setError(mensaje)
      setCampoConflicto(campoSenalado(mensaje))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      titulo="Convertir en cliente"
      subtitulo="Se crean el propietario, su organización y su primera granja. Los galpones y lotes se registran después, en la visita."
      onCerrar={onCerrar}
      acciones={
        <>
          <button type="button" className="modal-btn" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </button>
          <button type="submit" form={ID_FORMULARIO} className="modal-btn modal-btn--primary" disabled={guardando}>
            {guardando ? 'Creando…' : 'Crear cliente'}
          </button>
        </>
      }
    >
      <form id={ID_FORMULARIO} onSubmit={(evento) => void enviar(evento)}>
        <label className="modal-campo">
          <span>Nombre del propietario</span>
          <input value={form.nombre_completo} onChange={(e) => cambiar('nombre_completo', e.target.value)} required />
        </label>

        <div className="modal-fila">
          <label className="modal-campo">
            <span>Cédula</span>
            <input
              value={form.cedula}
              onChange={(e) => cambiar('cedula', e.target.value)}
              required
              aria-invalid={campoConflicto === 'cedula'}
              className={campoConflicto === 'cedula' ? 'crm-campo--choca' : undefined}
              autoFocus={form.cedula === ''}
              inputMode="numeric"
            />
            {/* El flujo de cotización no la pregunta —una cédula se pide en la
                llamada, no en un chat— pero el de PQRS sí. Si esta persona
                escribió antes por soporte, el dato ya viene y decirle que lo
                pida sería mandarle a preguntar algo que ya tiene. */}
            <small className="modal-ayuda">
              {prospecto.documento
                ? 'La dio al radicar una PQRS. Confírmala antes de crear la cuenta.'
                : 'No la pregunta el chatbot; pídesela al cliente.'}
            </small>
          </label>
          <label className="modal-campo">
            <span>Teléfono <em>(Opcional)</em></span>
            <input value={form.telefono} onChange={(e) => cambiar('telefono', e.target.value)} inputMode="tel" />
          </label>
        </div>

        <label className="modal-campo">
          <span>Correo</span>
          <input
            type="email"
            value={form.email}
            onChange={(e) => cambiar('email', e.target.value)}
            required
            aria-invalid={campoConflicto === 'email'}
            className={campoConflicto === 'email' ? 'crm-campo--choca' : undefined}
          />
          {/* Por WhatsApp el chatbot no lo pregunta, así que un prospecto de
              ese canal llega sin correo. Decirlo evita que el asesor busque un
              dato que nunca se pidió. */}
          <small className="modal-ayuda">
            {prospecto.email
              ? 'Lo dio en el chat. Con él entra al sistema: confírmalo antes de crear la cuenta.'
              : 'No lo pedimos por WhatsApp, así que hay que pedírselo. Con él entra al sistema.'}
          </small>
        </label>

        <label className="modal-campo">
          <span>Nombre de la organización</span>
          <input value={form.organizacion_nombre} onChange={(e) => cambiar('organizacion_nombre', e.target.value)} />
          <small className="modal-ayuda">La empresa cliente. De ella colgarán sus granjas y sus usuarios.</small>
        </label>

        <div className="modal-fila">
          <label className="modal-campo">
            <span>Nombre de la granja</span>
            <input
              value={form.granja_nombre}
              onChange={(e) => cambiar('granja_nombre', e.target.value)}
              required
              maxLength={120}
              aria-invalid={campoConflicto === 'granja_nombre'}
              className={campoConflicto === 'granja_nombre' ? 'crm-campo--choca' : undefined}
            />
            {/* Obligatorio: sin granja no hay galpones, ni lotes, ni monitoreo.
                El cuestionario dejó de preguntarlo al recortarse a nueve pasos,
                así que sale de la llamada. */}
            <small className="modal-ayuda">
              Es la finca, no la empresa: una organización puede tener varias.
              Sin ella el cliente entra a un sistema vacío.
            </small>
          </label>
          <label className="modal-campo">
            <span>Municipio <em>(Opcional)</em></span>
            <input
              value={form.granja_municipio}
              onChange={(e) => cambiar('granja_municipio', e.target.value)}
              maxLength={80}
            />
            <small className="modal-ayuda">Se puede completar después, en la visita.</small>
          </label>
        </div>

        <label className="modal-campo">
          <span>Contraseña inicial</span>
          <div className="crm-clave-fila">
            <input
              value={form.password}
              onChange={(e) => cambiar('password', e.target.value)}
              required
              minLength={8}
              autoComplete="off"
            />
            <button
              type="button"
              className="modal-btn"
              onClick={() => cambiar('password', contrasenaSugerida())}
            >
              Sugerir
            </button>
          </div>
          {/* Se muestra en claro a propósito: el asesor tiene que dictársela al
              cliente. La sugerida evita caracteres que se confunden al oído. */}
          <small className="modal-ayuda">
            Se la tendrás que dar al cliente. La sugerida no lleva caracteres que se
            confundan al dictarla.
          </small>
        </label>

        {error && <p className="modal-error" role="alert">{error}</p>}
      </form>
    </Modal>
  )
}

export default FormularioConversion
