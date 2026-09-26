import { useRef, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import Modal from '@shared/ui/Modal/Modal'
import { mensajeDeError } from '@shared/utils/errores'
import type { ProspectoDetalle } from '../api/prospectos'
import {
  campoSenalado,
  contrasenaSugerida,
  errorDeConversion,
  prellenarDesde,
  primerCampoInvalido,
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
  const [campoError, setCampoError] = useState<keyof Datos | null>(null)
  const campos = useRef<Partial<Record<keyof Datos, HTMLInputElement>>>({})

  function registrar(campo: keyof Datos) {
    return (elemento: HTMLInputElement | null) => {
      if (elemento) campos.current[campo] = elemento
    }
  }

  function cambiar<K extends keyof Datos>(campo: K, valor: Datos[K]) {
    setForm((actual) => ({ ...actual, [campo]: valor }))
    if (campoError === campo) setCampoError(null)
  }

  function enfocar(campo: keyof Datos | null) {
    if (campo) campos.current[campo]?.focus()
  }

  function idError(campo: keyof Datos) {
    return `crm-${campo}-error`
  }

  function descripcion(campo: keyof Datos, ayuda?: string) {
    const ids = [ayuda, campoError === campo && error ? idError(campo) : undefined]
      .filter(Boolean)
    return ids.join(' ') || undefined
  }

  function mensajeCampo(campo: keyof Datos) {
    if (campoError !== campo || !error) return null
    return <small id={idError(campo)} className="modal-error modal-error--campo" role="alert">{error}</small>
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const problema = errorDeConversion(form)
    if (problema) {
      const campo = primerCampoInvalido(form)
      setError(problema)
      setCampoError(campo)
      enfocar(campo)
      return
    }
    setGuardando(true)
    setError('')
    try {
      await onConvertir(form)
      onCerrar()
    } catch (problemaAlConvertir) {
      const mensaje = mensajeDeError(problemaAlConvertir, 'No se pudo convertir el prospecto.')
      const campo = campoSenalado(mensaje)
      setError(mensaje)
      setCampoError(campo)
      enfocar(campo)
    } finally {
      setGuardando(false)
    }
  }

  async function copiarClave() {
    if (!form.password) return
    try {
      await navigator.clipboard.writeText(form.password)
      toast.success('Contraseña copiada')
    } catch {
      toast.error('No se pudo copiar la contraseña.')
    }
  }

  const propietario = form.nombre_completo.trim() || 'Sin nombre'
  const organizacion = form.organizacion_nombre.trim() || `Organización de ${propietario}`
  const granja = form.granja_nombre.trim() || 'Sin nombre'

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
      <form id={ID_FORMULARIO} onSubmit={(evento) => void enviar(evento)} noValidate>
        <div className="crm-conv-resumen" aria-label="Resumen de la cuenta a crear">
          <div className="crm-conv-resumen-item">
            <span>Propietario</span>
            <strong>{propietario}</strong>
          </div>
          <div className="crm-conv-resumen-item">
            <span>Organización</span>
            <strong>{organizacion}</strong>
          </div>
          <div className="crm-conv-resumen-item">
            <span>Granja</span>
            <strong>{granja}</strong>
          </div>
        </div>

        {error && !campoError && <p className="modal-error" role="alert">{error}</p>}

        <fieldset className="modal-seccion">
          <legend>Propietario</legend>

          <label className="modal-campo">
            <span>Nombre del propietario</span>
            <input
              ref={registrar('nombre_completo')}
              name="nombre_completo"
              autoComplete="name"
              value={form.nombre_completo}
              onChange={(e) => cambiar('nombre_completo', e.target.value)}
              required
              aria-invalid={campoError === 'nombre_completo'}
              aria-describedby={descripcion('nombre_completo')}
              className={campoError === 'nombre_completo' ? 'crm-campo--choca' : undefined}
            />
            {mensajeCampo('nombre_completo')}
          </label>

          <div className="modal-fila">
            <label className="modal-campo">
              <span>Cédula</span>
              <input
                ref={registrar('cedula')}
                name="cedula"
                value={form.cedula}
                onChange={(e) => cambiar('cedula', e.target.value)}
                required
                inputMode="numeric"
                autoComplete="off"
                aria-invalid={campoError === 'cedula'}
                aria-describedby={descripcion('cedula', 'crm-cedula-ayuda')}
                className={campoError === 'cedula' ? 'crm-campo--choca' : undefined}
                autoFocus={form.cedula === ''}
              />

              <small className="modal-ayuda" id="crm-cedula-ayuda">
                {prospecto.documento
                  ? 'La dio al radicar una PQRS. Confírmala antes de crear la cuenta.'
                  : 'No la pregunta el chatbot; pídesela al cliente.'}
              </small>
              {mensajeCampo('cedula')}
            </label>
            <label className="modal-campo">
              <span>Teléfono <em>(Opcional)</em></span>
              <input
                ref={registrar('telefono')}
                name="telefono"
                autoComplete="tel"
                inputMode="tel"
                value={form.telefono}
                onChange={(e) => cambiar('telefono', e.target.value)}
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="modal-seccion">
          <legend>Organización y granja</legend>

          <label className="modal-campo">
            <span>Nombre de la organización <em>(Opcional)</em></span>
            <input
              ref={registrar('organizacion_nombre')}
              name="organizacion_nombre"
              autoComplete="organization"
              value={form.organizacion_nombre}
              onChange={(e) => cambiar('organizacion_nombre', e.target.value)}
            />
            <small className="modal-ayuda">
              La empresa cliente. De ella colgarán sus granjas y sus usuarios.
              Si la dejas vacía se llama como el propietario.
            </small>
          </label>

          <div className="modal-fila">
            <label className="modal-campo">
              <span>Nombre de la granja</span>
              <input
                ref={registrar('granja_nombre')}
                name="granja_nombre"
                value={form.granja_nombre}
                onChange={(e) => cambiar('granja_nombre', e.target.value)}
                required
                maxLength={120}
                aria-invalid={campoError === 'granja_nombre'}
                aria-describedby={descripcion('granja_nombre', 'crm-granja-ayuda')}
                className={campoError === 'granja_nombre' ? 'crm-campo--choca' : undefined}
              />

              <small className="modal-ayuda" id="crm-granja-ayuda">
                Es la finca, no la empresa: una organización puede tener varias.
                Sin ella el cliente entra a un sistema vacío.
              </small>
              {mensajeCampo('granja_nombre')}
            </label>
            <label className="modal-campo">
              <span>Municipio <em>(Opcional)</em></span>
              <input
                ref={registrar('granja_municipio')}
                name="granja_municipio"
                autoComplete="address-level2"
                value={form.granja_municipio}
                onChange={(e) => cambiar('granja_municipio', e.target.value)}
                maxLength={80}
              />
              <small className="modal-ayuda">Se puede completar después, en la visita.</small>
            </label>
          </div>
        </fieldset>

        <fieldset className="modal-seccion">
          <legend>Acceso</legend>

          <label className="modal-campo">
            <span>Correo</span>
            <input
              ref={registrar('email')}
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => cambiar('email', e.target.value)}
              required
              aria-invalid={campoError === 'email'}
              aria-describedby={descripcion('email', 'crm-email-ayuda')}
              className={campoError === 'email' ? 'crm-campo--choca' : undefined}
            />

            <small className="modal-ayuda" id="crm-email-ayuda">
              {prospecto.email
                ? 'Lo dio en el chat. Con él entra al sistema: confírmalo antes de crear la cuenta.'
                : 'No lo pedimos por WhatsApp, así que hay que pedírselo. Con él entra al sistema.'}
            </small>
            {mensajeCampo('email')}
          </label>

          <div className="modal-campo">
            <label className="modal-campo-etiqueta" htmlFor="crm-conversion-password">
              Contraseña inicial
            </label>
            <div className="crm-clave-fila">
              <input
                ref={registrar('password')}
                id="crm-conversion-password"
                name="password"
                type="text"
                value={form.password}
                onChange={(e) => cambiar('password', e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                aria-invalid={campoError === 'password'}
                aria-describedby={descripcion('password', 'crm-clave-ayuda')}
                className={campoError === 'password' ? 'crm-campo--choca' : undefined}
              />
              <button
                type="button"
                className="modal-btn"
                onClick={() => cambiar('password', contrasenaSugerida())}
              >
                Sugerir
              </button>
              <button
                type="button"
                className="modal-btn"
                onClick={() => void copiarClave()}
                disabled={!form.password}
              >
                Copiar
              </button>
            </div>

            <small className="modal-ayuda" id="crm-clave-ayuda">
              Se la tendrás que dar al cliente. La sugerida no lleva caracteres que se
              confundan al dictarla.
            </small>
            {mensajeCampo('password')}
          </div>
        </fieldset>
      </form>
    </Modal>
  )
}

export default FormularioConversion
