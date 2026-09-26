import { IcAlert, IcCheck, IcClock } from '@shared/ui/icons/icons'
import TarjetasResumen, { type Stat } from '@shared/ui/admin/TarjetasResumen'
import type { ResumenAlertas as Resumen } from '../model/alerta'

interface ResumenAlertasProps {
  resumen: Resumen
}

function ResumenAlertas({ resumen }: ResumenAlertasProps) {
  const tarjetas: Stat[] = [
    { label: 'Alertas registradas', valor: resumen.total, icono: <IcAlert size={20} />, tono: 'neutral' },
    { label: 'Por atender', valor: resumen.abiertas, icono: <IcAlert size={20} />, tono: 'aviso' },
    { label: 'En atención', valor: resumen.enProceso, icono: <IcClock size={20} />, tono: 'info' },
    { label: 'Críticas activas', valor: resumen.criticas, icono: <IcCheck size={20} />, tono: 'peligro' },
  ]

  return <TarjetasResumen stats={tarjetas} etiqueta="Resumen de alertas" />
}

export default ResumenAlertas
