import type { Usuario } from '@shared/api'

type Props = {
  usuario: Usuario
  onAlternarActivo: (usuario: Usuario) => void
  onGestionarAsignaciones: (usuario: Usuario) => void
  onMenu: (evento: React.MouseEvent, usuario: Usuario) => void
}

function obtenerIniciales(nombre: string): string {
  return (
    nombre
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte[0])
      .join('')
      .toUpperCase() || 'U'
  )
}

function FilaUsuario({
  usuario,
  onAlternarActivo,
  onGestionarAsignaciones,
  onMenu,
}: Props) {
  const rolClase = usuario.rol.nombre.toLowerCase()
  const esOperario = usuario.rol.nombre === 'Operario'

  return (
    <tr className={usuario.activo ? '' : 'is-inactive'}>
      <td>
        <div className="usuarios-persona-cell">
          <span
            className={`usuarios-avatar usuarios-avatar--${rolClase}`}
            aria-hidden="true"
          >
            {obtenerIniciales(usuario.nombre_completo)}
          </span>
          <div className="usuarios-persona-copy">
            <strong>{usuario.nombre_completo}</strong>
            <span>@{usuario.username}</span>
          </div>
        </div>
      </td>
      <td>
        <div className="usuarios-contacto-cell">
          <span>{usuario.email || 'Sin correo registrado'}</span>
          <small>{usuario.telefono ? `Tel. ${usuario.telefono}` : 'Sin teléfono'}</small>
        </div>
      </td>
      <td className="usuarios-cedula-cell">{usuario.cedula}</td>
      <td>
        <div className="usuarios-estado-cell">
          <label className="usuarios-switch">
            <input
              type="checkbox"
              checked={usuario.activo}
              onChange={() => onAlternarActivo(usuario)}
              aria-label={`${usuario.activo ? 'Desactivar' : 'Activar'} a ${usuario.nombre_completo}`}
            />
            <span className="usuarios-switch-slider" />
          </label>
          <span className={`usuarios-estado usuarios-estado--${usuario.activo ? 'activo' : 'inactivo'}`}>
            {usuario.activo ? 'Activo' : 'Inactivo'}
          </span>
        </div>
      </td>
      <td className="usuarios-col-acciones">
        <div className="usuarios-acciones-wrap">
          {esOperario && (
            <button
              type="button"
              className="usuarios-btn-galpones"
              onClick={() => onGestionarAsignaciones(usuario)}
            >
              Galpones
            </button>
          )}
          <button
            type="button"
            className="usuarios-btn-menu"
            onClick={(evento) => onMenu(evento, usuario)}
            aria-label={`Acciones para ${usuario.nombre_completo}`}
            aria-haspopup="menu"
          >
            ⋯
          </button>
        </div>
      </td>
    </tr>
  )
}

export default FilaUsuario
