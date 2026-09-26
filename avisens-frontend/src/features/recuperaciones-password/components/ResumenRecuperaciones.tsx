import type { RecuperacionPassword } from '../model/recuperacionPassword'
import CabeceraAdmin from '@shared/ui/admin/CabeceraAdmin'
import TarjetasResumen, { type Stat } from '@shared/ui/admin/TarjetasResumen'
import { IcCheck, IcClock, IcSettings, IcUsers } from '@shared/ui/icons/icons'

function ResumenRecuperaciones({ solicitudes }: { solicitudes: RecuperacionPassword[] }) {
  const pendientes = solicitudes.filter(({ estado }) => estado === 'pendiente').length
  const aprobadas = solicitudes.filter(({ estado }) => estado === 'aprobada').length
  const cerradas = solicitudes.filter(
    ({ estado }) => estado === 'rechazada' || estado === 'completada',
  ).length
  const indicadores: Stat[] = [
    { label: 'Total', valor: solicitudes.length, tono: 'neutral', icono: <IcUsers size={18} /> },
    { label: 'Por revisar', valor: pendientes, tono: 'aviso', icono: <IcClock size={18} /> },
    { label: 'Acceso temporal', valor: aprobadas, tono: 'info', icono: <IcSettings size={18} /> },
    { label: 'Cerradas', valor: cerradas, tono: 'ok', icono: <IcCheck size={18} /> },
  ]

  return (
    <>
      <CabeceraAdmin
        eyebrow="Seguridad de cuentas"
        titulo="Recuperación de acceso"
        subtitulo="Revisa solicitudes de propietarios y operarios. Al aprobar, AVISENS genera una contraseña temporal de un solo uso."
      />
      <TarjetasResumen stats={indicadores} etiqueta="Resumen de recuperaciones de contraseña" />
    </>
  )
}

export default ResumenRecuperaciones
