import { IcBox, IcDoc } from '@shared/ui/icons/icons'
import type { OrdenCompra } from '../model/ordenCompra'

type Props = { ordenes: OrdenCompra[] }

function ResumenOrdenes({ ordenes }: Props) {
  const pendientes = ordenes.filter((orden) => orden.estado === 'pendiente').length
  const enProceso = ordenes.filter((orden) => orden.estado === 'en_proceso').length
  const valorPendiente = ordenes
    .filter((orden) => orden.estado === 'pendiente' || orden.estado === 'en_proceso')
    .reduce((total, orden) => total + Number(orden.valor_total_cop ?? 0), 0)

  return (
    <div className="oc-resumen">
      <div className="oc-resumen-intro">
        <span className="oc-resumen-icon"><IcDoc size={24} /></span>
        <div>
          <p>Abastecimiento</p>
          <h1>Órdenes de compra</h1>
          <span>Registra lo pedido y recibe los insumos directamente en bodega.</span>
        </div>
      </div>
      <div className="oc-estadisticas">
        <div><strong>{pendientes}</strong><span>Pendientes</span></div>
        <div><strong>{enProceso}</strong><span>En recepción</span></div>
        <div><IcBox size={16} /><strong>{valorPendiente.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}</strong><span>Por recibir</span></div>
      </div>
    </div>
  )
}

export default ResumenOrdenes
