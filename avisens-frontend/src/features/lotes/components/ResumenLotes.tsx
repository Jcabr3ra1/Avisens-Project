import { IcAlert, IcCheck, IcClock, IcEgg, IcBox } from '@shared/ui/icons/icons'
import TarjetasResumen, { type Stat } from '@shared/ui/admin/TarjetasResumen'
import type { ResumenLotesDatos } from '../model/loteVista'

function ResumenLotes({ resumen }: { resumen: ResumenLotesDatos }) {
  const stats: Stat[] = [
    { label: 'Lotes', valor: resumen.total, icono: <IcBox size={18} />, tono: 'neutral' },
    { label: 'Activos', valor: resumen.activos, icono: <IcCheck size={18} />, tono: 'ok' },
    { label: 'Finalizados', valor: resumen.finalizados, icono: <IcClock size={18} />, tono: 'aviso' },
    { label: 'Inactivos', valor: resumen.inactivos, icono: <IcAlert size={18} />, tono: 'peligro' },
    { label: 'Aves activas', valor: resumen.avesActivas, icono: <IcEgg size={18} />, tono: 'info' },
  ]

  return <TarjetasResumen stats={stats} etiqueta="Resumen de lotes" />
}

export default ResumenLotes
