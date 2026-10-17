import { ETIQUETAS_ESTADO_RECUPERACION, type RecuperacionPassword } from '../model/recuperacionPassword'

const DIA = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
const HORA = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' })

function partesFecha(fecha: string | null): { dia: string; hora: string } | null {
  if (!fecha) return null
  const instante = new Date(fecha)
  return Number.isNaN(instante.getTime()) ? null : { dia: DIA.format(instante), hora: HORA.format(instante) }
}

function CeldaFecha({ fecha }: { fecha: string | null }) {
  const partes = partesFecha(fecha)
  if (!partes) return <>—</>
  return (
    <span className="rec-celda-texto rec-celda-texto--centro">
      <strong>{partes.dia}</strong>
      <span>{partes.hora}</span>
    </span>
  )
}

function iniciales(nombre: string): string {
  return nombre.trim().split(/\s+/).slice(0, 2).map((parte) => parte[0]?.toUpperCase()).join('') || '—'
}

type Props = {
  solicitudes: RecuperacionPassword[]
  onAbrir: (solicitud: RecuperacionPassword) => void
}

function TablaRecuperaciones({ solicitudes, onAbrir }: Props) {
  return (
    <section className="rec-listado rec-listado--pagina" aria-label="Solicitudes de recuperación">
      <div className="rec-tabla-contenedor">
        <table className="rec-tabla">
          <thead>
            <tr>
              <th scope="col">Persona</th>
              <th scope="col">Documento</th>
              <th scope="col">Solicitada</th>
              <th scope="col">Estado</th>
              <th scope="col"><span className="sr-only">Acción</span></th>
            </tr>
          </thead>
          <tbody>
            {solicitudes.map((solicitud) => (
              <tr key={solicitud.id}>
                <td>
                  <div className="rec-celda-persona">
                    <span className="rec-avatar" aria-hidden="true">{iniciales(solicitud.usuario.nombre_completo)}</span>
                    <span className="rec-celda-texto">
                      <strong>{solicitud.usuario.nombre_completo}</strong>
                      <span>{solicitud.usuario.username}</span>
                    </span>
                  </div>
                </td>
                <td className="rec-num">{solicitud.usuario.cedula}</td>
                <td className="rec-num"><CeldaFecha fecha={solicitud.fecha_creacion} /></td>
                <td><span className={`rec-estado rec-estado--${solicitud.estado}`}>{ETIQUETAS_ESTADO_RECUPERACION[solicitud.estado]}</span></td>
                <td>
                  <button className={`rec-accion${solicitud.estado === 'pendiente' ? ' rec-accion--principal' : ''}`} type="button" onClick={() => onAbrir(solicitud)}>
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
