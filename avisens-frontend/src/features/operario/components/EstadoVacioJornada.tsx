import { IcLeaf } from '@shared/ui/icons/icons'

function EstadoVacioJornada() {
  return (
    <section className="operario-empty">
      <IcLeaf size={34} />
      <h2>Aún no tienes galpones asignados</h2>
      <p>Pídele al administrador o al propietario que te asigne un galpón para iniciar tu jornada.</p>
    </section>
  )
}

export default EstadoVacioJornada
