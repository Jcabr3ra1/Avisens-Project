import { IcCheck, IcEgg, IcGrid, IcLeaf } from '@shared/ui/icons/icons'

interface EstadoInicialProps {
  granjas: number
  galpones: number
  rolVista: string | null
  onIrAProduccion: () => void
  onRecargar: () => void
}

function EstadoInicial({ granjas, galpones, rolVista, onIrAProduccion, onRecargar }: EstadoInicialProps) {
  const esAdministrador = rolVista === 'Administrador'
  const esPropietario = rolVista === 'Propietario'
  const sinGranja = granjas === 0
  const sinGalpon = galpones === 0

  if (esPropietario && sinGranja) {
    return (
      <section className="dashboard-setup" aria-labelledby="dashboard-setup-title">
        <div className="dashboard-setup__copy">
          <p className="dashboard-section-label">Configuración pendiente</p>
          <h1 id="dashboard-setup-title">Tu granja aún no ha sido asignada</h1>
          <p>
            Un administrador debe registrar y asignarte una granja antes de que puedas agregar galpones y lotes.
          </p>
        </div>
        <button className="dashboard-secondary-button" type="button" onClick={onRecargar}>
          Actualizar información
        </button>
        <p className="dashboard-setup__help">Cuando la asignación esté lista, aquí verás el siguiente paso.</p>
      </section>
    )
  }

  if (!esAdministrador && !esPropietario) {
    return (
      <section className="dashboard-setup" aria-labelledby="dashboard-setup-title">
        <div className="dashboard-setup__copy">
          <p className="dashboard-section-label">Configuración pendiente</p>
          <h1 id="dashboard-setup-title">Tu jornada aún no tiene producción asignada</h1>
          <p>Un administrador debe asignarte un galpón antes de que puedas registrar actividades de campo.</p>
        </div>
        <button className="dashboard-secondary-button" type="button" onClick={onRecargar}>
          Actualizar información
        </button>
      </section>
    )
  }

  const pasos = [
    {
      titulo: esAdministrador ? 'Crea una granja' : 'Granja asignada',
      completo: granjas > 0,
      icono: <IcLeaf size={22} />,
    },
    { titulo: 'Agrega un galpón', completo: galpones > 0, icono: <IcGrid size={22} /> },
    { titulo: 'Ingresa el primer lote', completo: false, icono: <IcEgg size={22} /> },
  ]

  const titulo = sinGranja
    ? 'Configura la producción'
    : sinGalpon
      ? 'Agrega el primer galpón'
      : 'Ingresa el primer lote'
  const descripcion = sinGranja
    ? 'El administrador registra la granja y la asigna a su propietario para iniciar la producción.'
    : sinGalpon
      ? 'La granja ya está disponible. Ahora registra el galpón donde se alojarán las aves.'
      : 'El galpón está listo. Registra un lote para iniciar el seguimiento productivo.'
  const etiquetaBoton = sinGranja && esAdministrador
    ? 'Crear granja'
    : sinGalpon
      ? 'Abrir mi granja'
      : 'Abrir producción'

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
              <small>Paso {indice + 1}</small>
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
