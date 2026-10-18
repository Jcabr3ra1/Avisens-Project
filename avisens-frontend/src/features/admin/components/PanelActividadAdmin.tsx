import { IcChevronRight } from '@shared/ui/icons/icons'
import type { Usuario } from '@shared/api'
import { hace } from '../model/adminResumen'

type RolClave = 'Administrador' | 'Propietario' | 'Operario'

type Props = {
  usuarios: Usuario[]
  total: number
  propietarios: number
  operarios: number
  administradores: number
  activos: number
  cargando: boolean
  onGestionar: (rol?: RolClave) => void
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
  const roles: {
    rol: RolClave
    etiqueta: string
    cantidad: number
    clase: string
    descripcion: string
  }[] = [
    {
      rol: 'Administrador',
      etiqueta: 'Administradores',
      cantidad: administradores,
      clase: 'admin-role-row--administrador',
      descripcion: 'Gobierno global de la plataforma y soporte',
    },
    {
      rol: 'Propietario',
      etiqueta: 'Propietarios',
      cantidad: propietarios,
      clase: 'admin-role-row--propietario',
      descripcion: 'Titulares de organizaciones, granjas y finanzas',
    },
    {
      rol: 'Operario',
      etiqueta: 'Operarios',
      cantidad: operarios,
      clase: 'admin-role-row--operario',
      descripcion: 'Bitácora diaria, pesajes y consumo en galpón',
    },
  ]

  return (
    <section className="admin-card admin-actividad" aria-label="Personas y roles de la plataforma">
      <div className="admin-card-head">
        <div>
          <h2 className="admin-card-title">Personas y roles</h2>
          <p className="admin-card-sub">
            {cargando ? 'Cargando cuentas…' : `${activos} de ${total} cuentas con acceso activo`}
          </p>
        </div>
        <button type="button" className="admin-card-link" onClick={() => onGestionar()}>
          Directorio <IcChevronRight size={13} />
        </button>
      </div>

      <div className="admin-card-body">
        <div className="admin-role-rows" role="list" aria-label="Cuentas divididas por rol">
          {roles.map((item) => {
            const porcentaje = total > 0 ? Math.round((item.cantidad / total) * 100) : 0
            return (
              <button
                key={item.rol}
                type="button"
                role="listitem"
                className={`admin-role-row ${item.clase}`}
                onClick={() => onGestionar(item.rol)}
              >
                <span className="admin-role-row-main">
                  <span className="admin-role-row-title">
                    <span className="admin-role-dot" aria-hidden="true" />
                    <strong>{item.etiqueta}</strong>
                  </span>
                  <span className="admin-role-row-desc">{item.descripcion}</span>
                </span>

                <span className="admin-role-row-count">
                  {cargando ? '…' : `${item.cantidad} ${item.cantidad === 1 ? 'cuenta' : 'cuentas'}`}
                </span>

                <span className="admin-role-row-pct">
                  {cargando ? '' : `${porcentaje}%`}
                </span>

                <IcChevronRight size={14} className="admin-feed-arrow" aria-hidden="true" />
              </button>
            )
          })}
        </div>

        {usuarios.length > 0 && (
          <div className="admin-crm-recientes">
            <div className="admin-crm-recientes-head">
              <span>Últimos registros</span>
              <span>Rol</span>
              <span>Alta</span>
            </div>
            <ul className="admin-feed">
              {usuarios.slice(0, 3).map((usuario) => {
                const iniciales = usuario.nombre_completo
                  .split(' ')
                  .slice(0, 2)
                  .map((parte) => parte[0])
                  .join('')
                  .toUpperCase()
                const rolNombre = usuario.rol.nombre as RolClave
                return (
                  <li key={usuario.id}>
                    <button
                      type="button"
                      className="admin-feed-row"
                      onClick={() => onGestionar(rolNombre)}
                    >
                      <span className="admin-feed-person">
                        <span className="admin-feed-avatar" aria-hidden="true">
                          {iniciales}
                        </span>
                        <span className="admin-feed-info">
                          <span className="admin-feed-nombre">{usuario.nombre_completo}</span>
                          <span className="admin-feed-meta">@{usuario.username}</span>
                        </span>
                      </span>

                      <span className="admin-feed-badge-col">
                        <span className={`admin-role-pill-sm admin-role-pill-sm--${rolNombre.toLowerCase()}`}>
                          {rolNombre}
                        </span>
                      </span>

                      <span className="admin-feed-hace">{hace(usuario.fecha_creacion)}</span>

                      <IcChevronRight size={14} className="admin-feed-arrow" aria-hidden="true" />
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>

      <footer className="admin-attention-footer">
        <button type="button" className="admin-attention-shortcut" onClick={() => onGestionar()}>
          Gestionar personas y roles <IcChevronRight size={12} />
        </button>
      </footer>
    </section>
  )
}

export default PanelActividadAdmin
