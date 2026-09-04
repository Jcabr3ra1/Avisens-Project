import TarjetasResumen, { type Stat } from '@shared/ui/admin/TarjetasResumen'
import { IcCheck, IcClose, IcUsers } from '@shared/ui/icons/icons'
import type { Proveedor } from '../model/proveedor'

type Props = {
  proveedores: Proveedor[]
}

function ResumenProveedores({ proveedores }: Props) {
  const activos = proveedores.filter((proveedor) => proveedor.activo).length
  const inactivos = proveedores.length - activos

  const stats: Stat[] = [
    { label: 'Total', valor: proveedores.length, icono: <IcUsers size={19} /> },
    { label: 'Activos', valor: activos, icono: <IcCheck size={19} />, tono: 'ok' },
    { label: 'Inactivos', valor: inactivos, icono: <IcClose size={19} />, tono: 'neutral' },
  ]

  return <TarjetasResumen stats={stats} etiqueta="Resumen de proveedores" />
}

export default ResumenProveedores
