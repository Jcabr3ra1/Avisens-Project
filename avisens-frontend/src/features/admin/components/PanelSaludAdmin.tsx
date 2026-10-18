import { IcAlert, IcCheck, IcChevronRight } from '@shared/ui/icons/icons'
import { haceCuanto, type ConectividadPlataforma } from '../model/conectividad'

type Props = {
  conectividad: ConectividadPlataforma | null
  cargando: boolean
  error: boolean
  onReintentar: () => void
  onAbrirOrganizacion: (id: number) => void
}

function PanelSaludAdmin({ conectividad, cargando, error, onReintentar, onAbrirOrganizacion }: Props) {
  const problemas = conectividad?.problemas ?? []
  const ventana = conectividad?.ventana_minutos ?? 15

  return (
    <section id="admin-salud" className="admin-card admin-salud" aria-labelledby="admin-salud-titulo" aria-busy={cargando}>
      <div className="admin-card-head">
        <div>
          <h2 id="admin-salud-titulo" className="admin-card-title">Salud de la plataforma</h2>
          <p className="admin-card-sub">Controladores que no han enviado datos en los últimos {ventana} minutos</p>
        </div>
        {conectividad && conectividad.total > 0 && (
          <span className={`admin-salud-resumen${problemas.length ? ' is-alerta' : ''}`}>
            {conectividad.conectados} de {conectividad.total} reportando
          </span>
        )}
      </div>

      {error ? (
        <div className="admin-salud-estado" role="alert">
          <span>No se pudo consultar el estado de los controladores.</span>
          <button type="button" className="admin-card-link" onClick={onReintentar}>Reintentar</button>
        </div>
      ) : cargando && !conectividad ? (
        <div className="admin-salud-estado"><span>Consultando controladores…</span></div>
      ) : !conectividad || conectividad.total === 0 ? (
        <div className="admin-salud-estado"><span>Todavía no hay controladores instalados en ninguna organización.</span></div>
      ) : problemas.length === 0 ? (
        <div className="admin-salud-estado admin-salud-estado--ok">
          <span className="admin-salud-icono admin-salud-icono--ok" aria-hidden="true"><IcCheck size={16} /></span>
          <span>Todos los controladores reportan con normalidad.</span>
        </div>
      ) : (
        <ul className="admin-salud-lista">
          {problemas.map((controlador) => (
            <li key={controlador.id}>
              <button type="button" className="admin-salud-fila" onClick={() => onAbrirOrganizacion(controlador.galpon.granja.organizacion.id)}>
                <span className="admin-salud-icono" aria-hidden="true"><IcAlert size={16} /></span>
                <span className="admin-salud-texto">
                  <strong>{controlador.nombre ?? controlador.codigo_topic}</strong>
                  <small>{controlador.galpon.granja.organizacion.nombre} · {controlador.galpon.granja.nombre} · {controlador.galpon.nombre}</small>
                </span>
                <span className={`admin-salud-tiempo${controlador.estado === 'nunca' ? ' is-nunca' : ''}`}>{haceCuanto(controlador.ultima_conexion)}</span>
                <IcChevronRight size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default PanelSaludAdmin
