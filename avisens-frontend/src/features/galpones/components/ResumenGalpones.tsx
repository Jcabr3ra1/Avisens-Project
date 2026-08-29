import type { ResumenGalponesDatos } from '../model/galponVista'

function ResumenGalpones({ resumen }: { resumen: ResumenGalponesDatos }) {
  return (
    <section className="galpones-resumen" aria-label="Resumen de galpones">
      <div className="galpones-stat"><strong>{resumen.total}</strong><span>Total</span></div>
      <div className="galpones-stat"><strong>{resumen.activos}</strong><span>Activos</span></div>
      <div className="galpones-stat"><strong>{resumen.inactivos}</strong><span>Inactivos</span></div>
      <div className="galpones-stat"><strong>{resumen.capacidad.toLocaleString()}</strong><span>Capacidad total</span></div>
    </section>
  )
}

export default ResumenGalpones
