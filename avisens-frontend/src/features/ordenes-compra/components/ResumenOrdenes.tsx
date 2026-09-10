import TarjetasResumen, { type Stat } from '@shared/ui/admin/TarjetasResumen'
import { IcBox, IcCoin, IcDoc } from '@shared/ui/icons/icons'
import type { OrdenCompra } from '../model/ordenCompra'

type Props = { ordenes: OrdenCompra[] }

function ResumenOrdenes({ ordenes }: Props) {
  const pendientes = ordenes.filter((orden) => orden.estado === 'pendiente').length
  const enProceso = ordenes.filter((orden) => orden.estado === 'en_proceso').length
  const valorPendiente = ordenes
    .filter((orden) => orden.estado === 'pendiente' || orden.estado === 'en_proceso')
    .reduce((total, orden) => total + Number(orden.valor_total_cop ?? 0), 0)

  const stats: Stat[] = [
    { label: 'Pendientes', valor: pendientes, icono: <IcDoc size={19} />, tono: 'aviso' },
    { label: 'En recepción', valor: enProceso, icono: <IcBox size={19} />, tono: 'info' },
    {
      label: 'Por recibir',
      valor: valorPendiente.toLocaleString('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
      }),
      icono: <IcCoin size={19} />,
    },
  ]

  return <TarjetasResumen stats={stats} etiqueta="Resumen de órdenes de compra" />
}

export default ResumenOrdenes
