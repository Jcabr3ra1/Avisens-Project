import { IcChat, IcUsers } from '@shared/ui/icons/icons'

function PanelEquipo() {
  return (
    <section className="comunicacion-empty" aria-labelledby="equipo-title">
      <span className="comunicacion-empty__icon" aria-hidden="true"><IcUsers size={28} /></span>
      <h3 id="equipo-title">Mensajes del equipo</h3>
      <p>Este espacio estará conectado a las conversaciones entre propietario y operarios. Aún no hay mensajes internos registrados para mostrar.</p>
      <span className="comunicacion-empty__note"><IcChat size={16} aria-hidden="true" />No se muestran conversaciones de ejemplo.</span>
    </section>
  )
}

export default PanelEquipo
