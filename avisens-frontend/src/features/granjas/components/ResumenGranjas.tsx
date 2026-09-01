import { IcCheck, IcGrid, IcLeaf, IcAlert } from '@shared/ui/icons/icons'
import TarjetasResumen, { type Stat } from '@shared/ui/admin/TarjetasResumen'
import type { ResumenGranjasDatos } from '../model/granjaVista'

function ResumenGranjas({ resumen }: { resumen: ResumenGranjasDatos }) {
  const stats: Stat[] = [
    { label: 'Granjas', valor: resumen.total, icono: <IcLeaf size={18} />, tono: 'neutral' },
    { label: 'Activas', valor: resumen.activas, icono: <IcCheck size={18} />, tono: 'ok' },
    { label: 'Inactivas', valor: resumen.inactivas, icono: <IcAlert size={18} />, tono: 'peligro' },
    {
      label: 'Área registrada',
      valor: `${resumen.areaTotal.toLocaleString()} m²`,
      icono: <IcGrid size={18} />,
      tono: 'info',
    },
  ]

  return <TarjetasResumen stats={stats} etiqueta="Resumen de granjas" />
}

export default ResumenGranjas
