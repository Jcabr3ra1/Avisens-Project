import { IcBarn } from '@shared/ui/icons/icons'
import './Estados.css'

type Props = {
  // Qué no se puede mostrar sin galpón: «tu jornada», «las lecturas de tus
  // sensores», «tus alertas»…
  queVerias: string
}

// Estado vacío único del operario sin galpones asignados. Antes Mi jornada,
// Monitoreo y Alertas decían cosas distintas («Aún no tienes galpones»,
// «No hay galpones registrados», «Todo en orden») y no se sabía si la granja
// no tenía galpones o si al operario no le habían asignado ninguno
// (auditoría QA 2026-10-30, HALL-02 y HALL-03).
function SinGalponesAsignados({ queVerias }: Props) {
  return (
    <section className="estado-vacio estado-sin-galpones adm-panel" role="status">
      <span className="estado-sin-galpones-icono" aria-hidden="true">
        <IcBarn size={26} />
      </span>
      <h3>No tienes galpones asignados</h3>
      <p>
        Pídele al administrador o al propietario que te asigne un galpón. Cuando lo haga, aquí
        verás {queVerias}.
      </p>
    </section>
  )
}

export default SinGalponesAsignados
