import { useState, type FormEvent } from 'react'
import { validarTextoSeguro } from '@shared/utils/validacion'

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
    const usuario = username.trim().toLowerCase()
    if (!usuario) {
      setErrorLocal('Escribe el usuario con el que ingresas a AVISENS.')
      return
    }
    if (!/^[a-z0-9][a-z0-9._-]{2,29}$/.test(usuario)) {
      setErrorLocal('El usuario debe tener entre 3 y 30 caracteres (letras sin tildes, números, punto o guion).')
      return
    }
    const errMotivo = validarTextoSeguro(motivo, 'El motivo', {
      max: 500,
      multilinea: true,
    })
    if (errMotivo) {
      setErrorLocal(errMotivo)
      return
    }
    const enviado = await onEnviar(usuario, motivo.trim())
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
