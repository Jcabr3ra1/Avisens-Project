import type { ResumenLotesDatos } from '../model/loteVista'

function ResumenLotes({ resumen }: { resumen: ResumenLotesDatos }) {
  return (
    <section className="lotes-resumen" aria-label="Resumen de lotes">
      <div className="lotes-stat"><strong>{resumen.total}</strong><span>Total</span></div>
      <div className="lotes-stat"><strong>{resumen.activos}</strong><span>Activos</span></div>
      <div className="lotes-stat"><strong>{resumen.finalizados}</strong><span>Finalizados</span></div>
      <div className="lotes-stat"><strong>{resumen.inactivos}</strong><span>Inactivos</span></div>
      <div className="lotes-stat"><strong>{resumen.avesActivas.toLocaleString()}</strong><span>Aves activas</span></div>
    </section>
  )
}

export default ResumenLotes
