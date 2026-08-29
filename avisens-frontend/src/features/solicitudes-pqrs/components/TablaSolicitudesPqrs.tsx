import type { SolicitudPqrs } from '../model/solicitudPqrs'

type Props = {
  solicitudes: SolicitudPqrs[]
  onAbrir: (solicitud: SolicitudPqrs) => void
}

const ETIQUETAS_ESTADO: Record<SolicitudPqrs['estado'], string> = {
  abierta: 'Abierta',
  en_proceso: 'En proceso',
  resuelta: 'Resuelta',
  cerrada: 'Cerrada',
}

function textoContacto(solicitud: SolicitudPqrs) {
  return solicitud.prospecto.nombre || solicitud.prospecto.telefono || solicitud.prospecto.email || 'Sin datos'
}

function formatearFecha(fecha: string) {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(fecha))
}

function TablaSolicitudesPqrs({ solicitudes, onAbrir }: Props) {
  return (
    <section className="pqrs-listado" aria-label="Listado de solicitudes PQRS">
      <div className="pqrs-listado-cabecera">
        <div>
          <h2>Solicitudes recibidas</h2>
          <p>{solicitudes.length} en el listado actual</p>
        </div>
      </div>

      <div className="pqrs-tabla-contenedor">
        <table>
          <thead>
            <tr>
              <th scope="col">Contacto</th>
              <th scope="col">Categoría</th>
              <th scope="col">Asunto</th>
              <th scope="col">Fecha</th>
              <th scope="col">Estado</th>
              <th scope="col"><span className="pqrs-sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            {solicitudes.map((solicitud) => (
              <tr key={solicitud.id}>
                <td>
                  <strong>{textoContacto(solicitud)}</strong>
                  {solicitud.prospecto.telefono && <span>{solicitud.prospecto.telefono}</span>}
                </td>
                <td>{solicitud.categoria}</td>
                <td>{solicitud.asunto || 'Sin asunto'}</td>
                <td>{formatearFecha(solicitud.fecha_creacion)}</td>
                <td>
                  <span className={`pqrs-estado pqrs-estado--${solicitud.estado}`}>
                    {ETIQUETAS_ESTADO[solicitud.estado]}
                  </span>
                </td>
                <td>
                  <button type="button" className="pqrs-boton-enlace" onClick={() => onAbrir(solicitud)}>
                    Ver detalle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default TablaSolicitudesPqrs
