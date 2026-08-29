import { IcAlert, IcCheck, IcEgg } from '@shared/ui/icons/icons'
import type { EstadoGeneralDashboard } from '../model/dashboard'

interface EstadoGeneralProps {
  estado: EstadoGeneralDashboard
  onAccion?: () => void
}

function EstadoGeneral({ estado, onAccion }: EstadoGeneralProps) {
  const Icono = estado.estado === 'correcto'
    ? IcCheck
    : estado.estado === 'sin_lote'
      ? IcEgg
      : IcAlert

  const textoAccion = estado.estado === 'correcto'
    ? 'Ver monitoreo'
    : estado.estado === 'sin_lote'
      ? 'Administrar lotes'
      : 'Revisar alertas'

  return (
    <section className={`dashboard-state dashboard-state--${estado.estado}`} aria-labelledby="dashboard-state-title">
      <span className="dashboard-state__icon" aria-hidden="true">
        <Icono size={30} />
      </span>
      <div className="dashboard-state__content">
        <p className="dashboard-section-label">Estado general</p>
        <h2 id="dashboard-state-title">{estado.titulo}</h2>
        <p>{estado.descripcion}</p>
      </div>
      {onAccion && (
        <button className="dashboard-state__action" type="button" onClick={onAccion}>
          {textoAccion}
        </button>
      )}
    </section>
  )
}

export default EstadoGeneral
