import { Link } from 'react-router-dom'
import { IcArrowUp, IcLeaf, IcPhone, IcSend } from '@shared/ui/icons/icons'
import { useFormularioProspecto } from '../hooks/useFormularioProspecto'

function FormularioProspecto() {
  const { formulario, errores, enviando, enviado, errorEnvio, actualizar, enviar } =
    useFormularioProspecto()

  if (enviado) {
    return (
      <section className="captacion-exito" aria-live="polite">
        <span className="captacion-exito-icon"><IcLeaf size={28} /></span>
        <p className="captacion-eyebrow">Solicitud recibida</p>
        <h1>Gracias por escribirnos.</h1>
        <p>Un asesor de AVISENS revisará tu información y se comunicará contigo.</p>
        <Link to="/" className="captacion-link-volver">
          <IcArrowUp size={16} /> Volver al inicio
        </Link>
      </section>
    )
  }

  return (
    <section className="captacion-card" aria-labelledby="captacion-titulo">
      <div className="captacion-intro">
        <p className="captacion-eyebrow">Conversemos sobre tu granja</p>
        <h1 id="captacion-titulo">Solicita acompañamiento para tu producción.</h1>
        <p>
          Déjanos estos datos básicos. Un asesor te contactará para conocer tu necesidad y
          mostrarte cómo AVISENS puede ayudarte.
        </p>
        <div className="captacion-telefono">
          <IcPhone size={18} />
          <span>También puedes escribirnos por WhatsApp desde la página principal.</span>
        </div>
      </div>

      <form className="captacion-form" onSubmit={(evento) => void enviar(evento)} noValidate>
        <div className="captacion-campos">
          <label className="captacion-campo" htmlFor="captacion-nombre">
            <span>Nombre completo <b aria-hidden="true">*</b></span>
            <input
              id="captacion-nombre"
              value={formulario.nombre}
              onChange={(evento) => actualizar('nombre', evento.target.value)}
              autoComplete="name"
              aria-invalid={Boolean(errores.nombre)}
              aria-describedby={errores.nombre ? 'captacion-nombre-error' : undefined}
            />
            {errores.nombre && <small id="captacion-nombre-error" role="alert">{errores.nombre}</small>}
          </label>

          <label className="captacion-campo" htmlFor="captacion-telefono">
            <span>Teléfono <b aria-hidden="true">*</b></span>
            <input
              id="captacion-telefono"
              type="tel"
              inputMode="tel"
              value={formulario.telefono}
              onChange={(evento) => actualizar('telefono', evento.target.value)}
              autoComplete="tel"
              aria-invalid={Boolean(errores.telefono)}
              aria-describedby={errores.telefono ? 'captacion-telefono-error' : undefined}
            />
            {errores.telefono && <small id="captacion-telefono-error" role="alert">{errores.telefono}</small>}
          </label>

          <label className="captacion-campo" htmlFor="captacion-municipio">
            <span>Municipio <b aria-hidden="true">*</b></span>
            <input
              id="captacion-municipio"
              value={formulario.municipio}
              onChange={(evento) => actualizar('municipio', evento.target.value)}
              autoComplete="address-level2"
              aria-invalid={Boolean(errores.municipio)}
              aria-describedby={errores.municipio ? 'captacion-municipio-error' : undefined}
            />
            {errores.municipio && <small id="captacion-municipio-error" role="alert">{errores.municipio}</small>}
          </label>

          <label className="captacion-campo" htmlFor="captacion-produccion">
            <span>¿Qué producción manejas? <b aria-hidden="true">*</b></span>
            <input
              id="captacion-produccion"
              value={formulario.tipo_produccion}
              onChange={(evento) => actualizar('tipo_produccion', evento.target.value)}
              aria-invalid={Boolean(errores.tipo_produccion)}
              aria-describedby={errores.tipo_produccion ? 'captacion-produccion-error' : undefined}
            />
            {errores.tipo_produccion && <small id="captacion-produccion-error" role="alert">{errores.tipo_produccion}</small>}
          </label>

          <label className="captacion-campo captacion-campo--full" htmlFor="captacion-email">
            <span>Correo electrónico <em>(opcional)</em></span>
            <input
              id="captacion-email"
              type="email"
              value={formulario.email}
              onChange={(evento) => actualizar('email', evento.target.value)}
              autoComplete="email"
              aria-invalid={Boolean(errores.email)}
              aria-describedby={errores.email ? 'captacion-email-error' : undefined}
            />
            {errores.email && <small id="captacion-email-error" role="alert">{errores.email}</small>}
          </label>
        </div>

        <label className="captacion-consentimiento" htmlFor="captacion-consentimiento">
          <input
            id="captacion-consentimiento"
            type="checkbox"
            checked={formulario.consentimiento_habeas_data}
            onChange={(evento) => actualizar('consentimiento_habeas_data', evento.target.checked)}
            aria-invalid={Boolean(errores.consentimiento_habeas_data)}
            aria-describedby={errores.consentimiento_habeas_data ? 'captacion-consentimiento-error' : undefined}
          />
          <span>Autorizo el tratamiento de mis datos para que AVISENS se comunique conmigo. <b aria-hidden="true">*</b></span>
        </label>
        {errores.consentimiento_habeas_data && (
          <small id="captacion-consentimiento-error" className="captacion-error" role="alert">
            {errores.consentimiento_habeas_data}
          </small>
        )}
        {errorEnvio && <p className="captacion-error-envio" role="alert">{errorEnvio}</p>}

        <button className="captacion-enviar" type="submit" disabled={enviando}>
          <IcSend size={18} /> {enviando ? 'Enviando solicitud…' : 'Quiero que me contacten'}
        </button>
      </form>
    </section>
  )
}

export default FormularioProspecto
