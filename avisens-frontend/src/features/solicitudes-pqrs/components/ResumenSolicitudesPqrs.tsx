import type { SolicitudPqrs } from '../model/solicitudPqrs'

type Props = {
  solicitudes: SolicitudPqrs[]
}

function ResumenSolicitudesPqrs({ solicitudes }: Props) {
  const abiertas = solicitudes.filter((solicitud) => solicitud.estado === 'abierta').length
  const enProceso = solicitudes.filter((solicitud) => solicitud.estado === 'en_proceso').length
  const resueltas = solicitudes.filter(
    (solicitud) => solicitud.estado === 'resuelta' || solicitud.estado === 'cerrada',
  ).length

  const indicadores = [
    { etiqueta: 'Total', valor: solicitudes.length, tono: 'neutral' },
    { etiqueta: 'Pendientes', valor: abiertas, tono: 'pendiente' },
    { etiqueta: 'En proceso', valor: enProceso, tono: 'proceso' },
    { etiqueta: 'Finalizadas', valor: resueltas, tono: 'finalizada' },
  ]

  return (
    <section className="pqrs-resumen" aria-label="Resumen de solicitudes PQRS">
      <div className="pqrs-intro">
        <p className="pqrs-kicker">Atención al cliente</p>
        <h1>Solicitudes PQRS</h1>
        <p>Organiza las peticiones, quejas, reclamos y sugerencias recibidas.</p>
      </div>

      <div className="pqrs-indicadores">
        {indicadores.map((indicador) => (
          <article key={indicador.etiqueta} className={`pqrs-indicador pqrs-indicador--${indicador.tono}`}>
            <strong>{indicador.valor}</strong>
            <span>{indicador.etiqueta}</span>
          </article>
        ))}
      </div>
    </section>
  )
}

export default ResumenSolicitudesPqrs
