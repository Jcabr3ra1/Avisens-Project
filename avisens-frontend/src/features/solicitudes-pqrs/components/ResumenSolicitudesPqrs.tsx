import type { SolicitudPqrs } from '../model/solicitudPqrs'
import TarjetasResumen, { type Stat } from '@shared/ui/admin/TarjetasResumen'
import { IcAlert, IcCheck, IcClock, IcDoc } from '@shared/ui/icons/icons'

type Props = {
  solicitudes: SolicitudPqrs[]
}

function ResumenSolicitudesPqrs({ solicitudes }: Props) {
  const abiertas = solicitudes.filter((solicitud) => solicitud.estado === 'abierta').length
  const enProceso = solicitudes.filter((solicitud) => solicitud.estado === 'en_proceso').length
  const resueltas = solicitudes.filter(
    (solicitud) => solicitud.estado === 'resuelta' || solicitud.estado === 'cerrada',
  ).length

  const indicadores: Stat[] = [
    { label: 'Total', valor: solicitudes.length, icono: <IcDoc size={18} /> },
    { label: 'Pendientes', valor: abiertas, icono: <IcAlert size={18} />, tono: 'aviso' },
    { label: 'En proceso', valor: enProceso, icono: <IcClock size={18} />, tono: 'info' },
    { label: 'Finalizadas', valor: resueltas, icono: <IcCheck size={18} />, tono: 'ok' },
  ]

  return <TarjetasResumen stats={indicadores} etiqueta="Resumen de solicitudes PQRS" />
}

export default ResumenSolicitudesPqrs
