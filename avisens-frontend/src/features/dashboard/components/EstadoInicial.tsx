import { IcCheck, IcEgg, IcGrid, IcLeaf } from '@shared/ui/icons/icons'

interface EstadoInicialProps {
  granjas: number
  galpones: number
  puedeAdministrar: boolean
  onComenzar: () => void
  onRecargar: () => void
}

function EstadoInicial({ granjas, galpones, puedeAdministrar, onComenzar, onRecargar }: EstadoInicialProps) {
  const pasos = [
    { titulo: 'Crea una granja', completo: granjas > 0, icono: <IcLeaf size={22} /> },
    { titulo: 'Agrega un galpón', completo: galpones > 0, icono: <IcGrid size={22} /> },
    { titulo: 'Ingresa el primer lote', completo: false, icono: <IcEgg size={22} /> },
  ]

  return (
    <section className="dashboard-setup" aria-labelledby="dashboard-setup-title">
      <div className="dashboard-setup__copy">
        <p className="dashboard-section-label">Primeros pasos</p>
        <h1 id="dashboard-setup-title">Configura tu producción</h1>
        <p>
          Avisens necesita conocer tu granja, sus galpones y el lote que vas a gestionar.
          No mostraremos información simulada mientras completas estos datos.
        </p>
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

      <button className="dashboard-primary-button" type="button" onClick={puedeAdministrar ? onComenzar : onRecargar}>
        {puedeAdministrar ? 'Comenzar configuración' : 'Actualizar información'}
      </button>
      {!puedeAdministrar && (
        <p className="dashboard-setup__help">Solicita al propietario que complete la configuración inicial.</p>
      )}
    </section>
  )
}

export default EstadoInicial
