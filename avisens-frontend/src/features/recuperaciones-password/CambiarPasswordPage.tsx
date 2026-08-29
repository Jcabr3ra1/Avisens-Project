import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { clearCambioPasswordToken, getCambioPasswordToken } from '@shared/api/tokens'
import { cambiarPasswordTemporal } from './api/recuperacionesPassword'
import './RecuperacionesPassword.css'

function CambiarPasswordPage() {
  const navigate = useNavigate()
  const [nuevaPassword, setNuevaPassword] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    if (!getCambioPasswordToken()) navigate('/login', { replace: true })
  }, [navigate])

  const enviar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (nuevaPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (nuevaPassword !== confirmacion) {
      setError('Las contraseñas no coinciden.')
      return
    }
    const token = getCambioPasswordToken()
    if (!token) {
      navigate('/login', { replace: true })
      return
    }

    setGuardando(true)
    try {
      const respuesta = await cambiarPasswordTemporal(nuevaPassword, token)
      clearCambioPasswordToken()
      setMensaje(respuesta.mensaje)
    } catch {
      setError('No se pudo actualizar la contraseña. Solicita una nueva recuperación si el acceso temporal venció.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <main className="rec-publica">
      <section className="rec-publica-tarjeta" aria-labelledby="cambiar-password-titulo">
        <p className="rec-kicker">AVISENS · Acceso seguro</p>
        <h1 id="cambiar-password-titulo">Crea tu nueva contraseña</h1>
        <p className="rec-publica-intro">Tu contraseña temporal es válida una sola vez. Define una nueva para continuar.</p>
        {mensaje ? (
          <>
            <p className="rec-aviso rec-aviso--exito" role="status">{mensaje}</p>
            <Link className="rec-boton rec-boton--principal" to="/login">Ir a iniciar sesión</Link>
          </>
        ) : (
          <form className="rec-formulario" onSubmit={(event) => void enviar(event)} noValidate>
            <label className="rec-campo" htmlFor="nueva-password">
              <span>Nueva contraseña</span>
              <input id="nueva-password" type="password" value={nuevaPassword} onChange={(event) => setNuevaPassword(event.target.value)} autoComplete="new-password" minLength={8} />
            </label>
            <label className="rec-campo" htmlFor="confirmar-password">
              <span>Confirma la contraseña</span>
              <input id="confirmar-password" type="password" value={confirmacion} onChange={(event) => setConfirmacion(event.target.value)} autoComplete="new-password" minLength={8} />
            </label>
            {error && <p className="rec-aviso rec-aviso--error" role="alert">{error}</p>}
            <button className="rec-boton rec-boton--principal" type="submit" disabled={guardando} aria-busy={guardando}>
              {guardando ? 'Actualizando…' : 'Guardar nueva contraseña'}
            </button>
          </form>
        )}
      </section>
    </main>
  )
}

export default CambiarPasswordPage
