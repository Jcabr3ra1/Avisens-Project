import type { Usuario } from '@shared/api'

type Props = {
  usuario: Usuario
  onAlternarActivo: (usuario: Usuario) => void
  onMenu: (evento: React.MouseEvent, usuario: Usuario) => void
}

function FilaUsuario({ usuario, onAlternarActivo, onMenu }: Props) {
  return (
    <tr className={usuario.activo ? '' : 'is-inactive'}>
      <td>{usuario.nombre_completo}</td>
      <td>{usuario.email}</td>
      <td>{usuario.cedula}</td>
      <td>{usuario.telefono || '—'}</td>
      <td>
        <span className={`usuarios-rol usuarios-rol--${usuario.rol.nombre.toLowerCase()}`}>
          {usuario.rol.nombre}
        </span>
      </td>
      <td>
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
      </td>
      <td className="usuarios-col-acciones">
        <button
          type="button"
          className="usuarios-btn-menu"
          onClick={(evento) => onMenu(evento, usuario)}
          aria-label={`Acciones para ${usuario.nombre_completo}`}
          aria-haspopup="menu"
        >
          ⋯
        </button>
      </td>
    </tr>
  )
}

export default FilaUsuario
