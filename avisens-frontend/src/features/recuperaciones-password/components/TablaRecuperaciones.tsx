import type { RecuperacionPassword } from '../model/recuperacionPassword'

const etiquetasEstado = {
  pendiente: 'Por revisar',
  aprobada: 'Acceso temporal',
  rechazada: 'Rechazada',
  completada: 'Completada',
} as const

function formatearFecha(fecha: string | null) {
  if (!fecha) return '—'
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(fecha))
}

type Props = {
  solicitudes: RecuperacionPassword[]
  onAbrir: (solicitud: RecuperacionPassword) => void
}

function TablaRecuperaciones({ solicitudes, onAbrir }: Props) {
  return (
    <section className="rec-listado" aria-labelledby="rec-listado-titulo">
      <header className="rec-listado-cabecera">
        <div>
          <h2 id="rec-listado-titulo">Solicitudes recibidas</h2>
          <p>Selecciona una solicitud para verificarla y atenderla.</p>
        </div>
        <span>{solicitudes.length} registradas</span>
      </header>
      <div className="rec-tabla-contenedor">
        <table>
          <thead>
            <tr>
              <th scope="col">Persona</th>
              <th scope="col">Documento</th>
              <th scope="col">Solicitud</th>
              <th scope="col">Estado</th>
              <th scope="col">Acción</th>
            </tr>
          </thead>
          <tbody>
            {solicitudes.map((solicitud) => (
              <tr key={solicitud.id}>
                <td>
                  <strong>{solicitud.usuario.nombre_completo}</strong>
                  <span>{solicitud.usuario.email}</span>
                </td>
                <td>{solicitud.usuario.cedula}</td>
                <td>{formatearFecha(solicitud.fecha_creacion)}</td>
                <td><span className={`rec-estado rec-estado--${solicitud.estado}`}>{etiquetasEstado[solicitud.estado]}</span></td>
                <td>
                  <button className="rec-boton-enlace" type="button" onClick={() => onAbrir(solicitud)}>
                    {solicitud.estado === 'pendiente' ? 'Revisar' : 'Ver detalle'}
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

export default TablaRecuperaciones
