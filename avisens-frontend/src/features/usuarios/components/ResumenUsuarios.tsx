import type { ResumenDeUsuarios } from '../hooks/useResumenUsuarios'
import TarjetasResumen, { type Stat } from '@shared/ui/admin/TarjetasResumen'
import { IcCheck, IcUsers } from '@shared/ui/icons/icons'

type Props = {
  resumen: ResumenDeUsuarios
  esPropietario: boolean
}

function ResumenUsuarios({ resumen, esPropietario }: Props) {
  const stats: Stat[] = [
    {
      label: esPropietario ? 'Operarios' : 'Usuarios',
      valor: resumen.total,
      icono: <IcUsers size={19} />,
    },
    {
      label: 'Activos',
      valor: resumen.activos,
      icono: <IcCheck size={19} />,
      tono: 'ok',
    },
  ]

  if (!esPropietario) {
    stats.push(
      { label: 'Propietarios', valor: resumen.propietarios, icono: <IcUsers size={19} /> },
      { label: 'Operarios', valor: resumen.operarios, icono: <IcUsers size={19} />, tono: 'info' },
    )
  }

  return <TarjetasResumen stats={stats} etiqueta="Resumen de usuarios" />
}

export default ResumenUsuarios
