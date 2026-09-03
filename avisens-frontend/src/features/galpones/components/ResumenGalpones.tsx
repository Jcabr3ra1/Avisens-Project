import { IcAlert, IcCheck, IcEgg, IcGrid } from '@shared/ui/icons/icons'
import TarjetasResumen, { type Stat } from '@shared/ui/admin/TarjetasResumen'
import type { ResumenGalponesDatos } from '../model/galponVista'

function ResumenGalpones({ resumen }: { resumen: ResumenGalponesDatos }) {
  const stats: Stat[] = [
    { label: 'Galpones', valor: resumen.total, icono: <IcGrid size={18} />, tono: 'neutral' },
    { label: 'Activos', valor: resumen.activos, icono: <IcCheck size={18} />, tono: 'ok' },
    { label: 'Inactivos', valor: resumen.inactivos, icono: <IcAlert size={18} />, tono: 'peligro' },
    {
      label: 'Capacidad total',
      valor: resumen.capacidad,
      icono: <IcEgg size={18} />,
      tono: 'info',
    },
  ]

  return <TarjetasResumen stats={stats} etiqueta="Resumen de galpones" />
}

export default ResumenGalpones
