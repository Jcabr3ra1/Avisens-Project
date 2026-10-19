import { useState, type FormEvent } from 'react'

type Props = {
  enviando: boolean
  onEnviar: (username: string, motivo: string) => Promise<boolean>
}

function FormularioSolicitudRecuperacion({ enviando, onEnviar }: Props) {
  const [username, setUsername] = useState('')
  const [motivo, setMotivo] = useState('')
  const [errorLocal, setErrorLocal] = useState('')

  const enviar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorLocal('')
    if (!username.trim()) {
      setErrorLocal('Escribe el usuario con el que ingresas a AVISENS.')
      return
    }
    const enviado = await onEnviar(username, motivo)
    if (enviado) {
      setUsername('')
      setMotivo('')
    }
  }

  return (
    <form className="rec-formulario" onSubmit={(event) => void enviar(event)} noValidate>
      <label className="rec-campo" htmlFor="rec-username">
        <span>Usuario de tu cuenta</span>
        <input
          id="rec-username"
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="maria.lopez"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={30}
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
