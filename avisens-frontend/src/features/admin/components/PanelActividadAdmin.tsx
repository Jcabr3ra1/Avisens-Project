import { IcBell, IcChevronRight } from '@shared/ui/icons/icons'
import type { Usuario } from '@shared/api'
import { hace } from '../model/adminResumen'

type Props = {
  usuarios: Usuario[]
  total: number
  propietarios: number
  operarios: number
  administradores: number
  activos: number
  cargando: boolean
  onGestionar: () => void
}

function PanelActividadAdmin({
  usuarios,
  total,
  propietarios,
  operarios,
  administradores,
  activos,
  cargando,
  onGestionar,
}: Props) {
  const roles = [
    { etiqueta: 'Administradores', cantidad: administradores, clase: 'admin-role-segment--administrador' },
    { etiqueta: 'Propietarios', cantidad: propietarios, clase: 'admin-role-segment--propietario' },
    { etiqueta: 'Operarios', cantidad: operarios, clase: 'admin-role-segment--operario' },
  ]

  return (
    <section className="admin-card admin-actividad" aria-label="Actividad reciente de usuarios">
      <div className="admin-card-head">
        <h2 className="admin-card-title"><IcBell size={16} /> Actividad reciente</h2>
        <button type="button" className="admin-card-link" onClick={onGestionar}>
          Gestionar <IcChevronRight size={13} />
        </button>
      </div>
      <p className="admin-card-sub">Composición del equipo y últimos registros</p>

      <div className="admin-role-overview" aria-label="Distribución de cuentas por rol">
        <div className="admin-role-overview-head">
          <span>Distribución de cuentas</span>
          <strong>{cargando ? '…' : `${activos}/${total}`} <small>con acceso</small></strong>
        </div>
        <div className={`admin-role-chart${total === 0 ? ' admin-role-chart--empty' : ''}`} aria-hidden="true">
          {roles.filter((rol) => rol.cantidad > 0).map((rol) => (
            <span key={rol.etiqueta} className={`admin-role-segment ${rol.clase}`} style={{ flexGrow: rol.cantidad }} />
          ))}
        </div>
        <ul className="admin-role-legend">
          {roles.map((rol) => (
            <li key={rol.etiqueta}>
              <span className={`admin-role-dot ${rol.clase}`} aria-hidden="true" />
              <span>{rol.etiqueta}</span>
              <strong>{cargando ? '…' : rol.cantidad}</strong>
            </li>
          ))}
        </ul>
      </div>

      {usuarios.length === 0 ? (
        <p className="admin-feed-vacio">{cargando ? 'Cargando…' : 'Sin usuarios registrados todavía.'}</p>
      ) : (
        <ul className="admin-feed">
          {usuarios.map((usuario) => {
            const iniciales = usuario.nombre_completo.split(' ').slice(0, 2).map((parte) => parte[0]).join('')
            const esPropietario = usuario.rol.nombre === 'Propietario'
            return (
              <li key={usuario.id} className="admin-feed-item">
                <span className={`admin-feed-avatar admin-feed-avatar--${esPropietario ? 'p' : 'o'}`}>{iniciales}</span>
                <div className="admin-feed-info">
                  <span className="admin-feed-nombre">{usuario.nombre_completo}</span>
                  <span className="admin-feed-meta">Registrado · {usuario.rol.nombre}</span>
                </div>
                <span className="admin-feed-hace">{hace(usuario.fecha_creacion)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default PanelActividadAdmin
