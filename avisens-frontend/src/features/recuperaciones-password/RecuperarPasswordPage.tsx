import { Link } from 'react-router-dom'
import FormularioSolicitudRecuperacion from './components/FormularioSolicitudRecuperacion'
import { useSolicitudRecuperacion } from './hooks/useSolicitudRecuperacion'
import './RecuperacionesPassword.css'

function RecuperarPasswordPage() {
  const { enviando, mensaje, error, enviar } = useSolicitudRecuperacion()

  return (
    <main className="rec-publica">
      <section className="rec-publica-tarjeta" aria-labelledby="recuperar-titulo">
        <p className="rec-kicker">AVISENS · Acceso seguro</p>
        <h1 id="recuperar-titulo">Recupera tu acceso</h1>
        <p className="rec-publica-intro">Si eres propietario u operario, envía la solicitud con el correo de tu cuenta. Un administrador la revisará antes de restablecer tu acceso.</p>
        {mensaje && <p className="rec-aviso rec-aviso--exito" role="status">{mensaje}</p>}
        {error && <p className="rec-aviso rec-aviso--error" role="alert">{error}</p>}
        {!mensaje && <FormularioSolicitudRecuperacion enviando={enviando} onEnviar={enviar} />}
        <Link className="rec-volver" to="/login">Volver a iniciar sesión</Link>
      </section>
    </main>
  )
}

export default RecuperarPasswordPage
