import { IcBell, IcChevronRight } from '@shared/ui/icons/icons'
import type { Usuario } from '@shared/api'
import { hace } from '../model/adminResumen'

type Props = {
  usuarios: Usuario[]
  total: number
  propietarios: number
  operarios: number
  activos: number
  cargando: boolean
  onGestionar: () => void
}

function PanelActividadAdmin({
  usuarios,
  total,
  propietarios,
  operarios,
  activos,
  cargando,
  onGestionar,
}: Props) {
  return (
    <section className="admin-card admin-actividad" aria-label="Actividad reciente de usuarios">
      <div className="admin-card-head">
        <span className="admin-card-title"><IcBell size={15} /> Actividad reciente</span>
        <button type="button" className="admin-card-link" onClick={onGestionar}>
          Gestionar <IcChevronRight size={13} />
        </button>
      </div>
      <p className="admin-card-sub">Usuarios del sistema y últimos registros</p>

      <div className="admin-act-counters">
        <div className="admin-act-counter"><strong>{cargando ? '…' : total}</strong><span>Total</span></div>
        <div className="admin-act-counter"><strong>{cargando ? '…' : propietarios}</strong><span>Propietarios</span></div>
        <div className="admin-act-counter"><strong>{cargando ? '…' : operarios}</strong><span>Operarios</span></div>
        <div className="admin-act-counter admin-act-counter--activo"><strong>{cargando ? '…' : activos}</strong><span>Activos</span></div>
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
