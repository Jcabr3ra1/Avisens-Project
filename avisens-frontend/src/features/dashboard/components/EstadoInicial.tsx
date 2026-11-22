import { IcCheck, IcEgg, IcGrid, IcLeaf } from '@shared/ui/icons/icons'

interface EstadoInicialProps {
  granjas: number
  galpones: number
  rol: string | null
  onIrAProduccion: () => void
  onRecargar: () => void
}

function EstadoInicial({ granjas, galpones, rol, onIrAProduccion, onRecargar }: EstadoInicialProps) {
  const esAdministrador = rol === 'Administrador'
  const esPropietario = rol === 'Propietario'
  const sinGranja = granjas === 0
  const sinGalpon = galpones === 0

  if (esPropietario && sinGranja) {
    return (
      <section className="dashboard-setup" aria-labelledby="dashboard-setup-title">
        <div className="dashboard-setup__copy">
          <p className="dashboard-section-label">Falta un paso</p>
          <h1 id="dashboard-setup-title">Todavía no tienes una granja en Avisens</h1>
          <p>
            Alguien del equipo de Avisens debe crear tu granja y dejarla a tu nombre. Después podrás registrar tus galpones y tus pollos.
          </p>
        </div>
        <p className="dashboard-setup__help">Cuando tu granja esté lista, aquí verás qué hacer después.</p>
      </section>
    )
  }

  if (!esAdministrador && !esPropietario) {
    return (
      <section className="dashboard-setup" aria-labelledby="dashboard-setup-title">
        <div className="dashboard-setup__copy">
          <p className="dashboard-section-label">Falta un paso</p>
          <h1 id="dashboard-setup-title">Todavía no tienes un galpón asignado</h1>
          <p>Alguien del equipo de Avisens debe asignarte un galpón para que puedas anotar tu trabajo.</p>
        </div>
        <button className="dashboard-secondary-button" type="button" onClick={onRecargar}>
          Volver a mirar
        </button>
      </section>
    )
  }

  const pasos = [
    {
      titulo: esAdministrador ? 'Crea una granja' : 'Tu granja lista',
      completo: granjas > 0,
      icono: <IcLeaf size={22} />,
    },
    { titulo: 'Agrega un galpón', completo: galpones > 0, icono: <IcGrid size={22} /> },
    { titulo: 'Registra el primer lote', completo: false, icono: <IcEgg size={22} /> },
  ]

  const titulo = sinGranja
    ? 'Vamos a preparar tu granja'
    : sinGalpon
      ? 'Agrega tu primer galpón'
      : 'Registra tu primer lote de pollos'
  const descripcion = sinGranja
    ? 'Avisens crea la granja y la deja a nombre de su dueño para que pueda empezar.'
    : sinGalpon
      ? 'Tu granja ya está lista. Ahora registra el galpón donde van a vivir los pollos.'
      : 'Tu galpón está listo. Registra un lote de pollos para empezar a ver cómo van.'
  const etiquetaBoton = sinGranja && esAdministrador
    ? 'Crear granja'
    : sinGalpon
      ? 'Abrir mi granja'
      : 'Registrar mi lote'

  return (
    <section className="dashboard-setup" aria-labelledby="dashboard-setup-title">
      <div className="dashboard-setup__copy">
        <p className="dashboard-section-label">Primeros pasos</p>
        <h1 id="dashboard-setup-title">{titulo}</h1>
        <p>{descripcion}</p>
      </div>

      <ol className="dashboard-setup__steps">
        {pasos.map((paso, indice) => (
          <li key={paso.titulo} className={paso.completo ? 'is-complete' : ''}>
            <span className="dashboard-setup__step-icon" aria-hidden="true">
              {paso.completo ? <IcCheck size={22} /> : paso.icono}
            </span>
            <span>
              <small>Paso {indice + 1} de {pasos.length}</small>
              <strong>{paso.titulo}</strong>
            </span>
          </li>
        ))}
      </ol>

      <button className="dashboard-primary-button" type="button" onClick={onIrAProduccion}>
        {etiquetaBoton}
      </button>
    </section>
  )
}

export default EstadoInicial
