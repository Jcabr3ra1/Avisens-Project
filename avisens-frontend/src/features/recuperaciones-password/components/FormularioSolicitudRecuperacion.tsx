import { useState, type FormEvent } from 'react'

type Props = {
  enviando: boolean
  onEnviar: (email: string, motivo: string) => Promise<boolean>
}

function FormularioSolicitudRecuperacion({ enviando, onEnviar }: Props) {
  const [email, setEmail] = useState('')
  const [motivo, setMotivo] = useState('')
  const [errorLocal, setErrorLocal] = useState('')

  const enviar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorLocal('')
    if (!email.trim()) {
      setErrorLocal('Escribe el correo con el que ingresas a AVISENS.')
      return
    }
    const enviado = await onEnviar(email, motivo)
    if (enviado) {
      setEmail('')
      setMotivo('')
    }
  }

  return (
    <form className="rec-formulario" onSubmit={(event) => void enviar(event)} noValidate>
      <label className="rec-campo" htmlFor="rec-email">
        <span>Correo de tu cuenta</span>
        <input
          id="rec-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="nombre@granja.co"
          autoComplete="email"
          aria-invalid={Boolean(errorLocal) || undefined}
          aria-describedby={errorLocal ? 'rec-error-local' : undefined}
        />
      </label>
      <label className="rec-campo" htmlFor="rec-motivo">
        <span>¿Qué ocurrió? <em>Opcional</em></span>
        <textarea
          id="rec-motivo"
          value={motivo}
          onChange={(event) => setMotivo(event.target.value)}
          placeholder="Por ejemplo: olvidé mi contraseña."
          maxLength={500}
          rows={3}
        />
      </label>
      {errorLocal && <p id="rec-error-local" className="rec-aviso rec-aviso--error" role="alert">{errorLocal}</p>}
      <button className="rec-boton rec-boton--principal" type="submit" disabled={enviando} aria-busy={enviando}>
        {enviando ? 'Enviando solicitud…' : 'Solicitar recuperación'}
      </button>
    </form>
  )
}

export default FormularioSolicitudRecuperacion
