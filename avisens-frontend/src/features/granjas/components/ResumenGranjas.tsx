import type { ResumenGranjasDatos } from '../model/granjaVista'

function ResumenGranjas({ resumen }: { resumen: ResumenGranjasDatos }) {
  return (
    <section className="grj-resumen" aria-label="Resumen de granjas">
      <div className="grj-stat"><strong>{resumen.total}</strong><span>Total</span></div>
      <div className="grj-stat"><strong>{resumen.activas}</strong><span>Activas</span></div>
      <div className="grj-stat"><strong>{resumen.inactivas}</strong><span>Inactivas</span></div>
      <div className="grj-stat"><strong>{resumen.areaTotal.toLocaleString()} m²</strong><span>Área registrada</span></div>
    </section>
  )
}

export default ResumenGranjas
