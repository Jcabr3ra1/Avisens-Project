interface Props {
  top: number
  left: number
  activo: boolean
  nombreEntidad: string
  onEditar: () => void
  onAlternar: () => void
  onEliminar: () => void
  onCerrar: () => void
}

function MenuAcciones({
  top,
  left,
  activo,
  nombreEntidad,
  onEditar,
  onAlternar,
  onEliminar,
  onCerrar,
}: Props) {
  return (
    <>
      <button
        className="menu-overlay"
        type="button"
        aria-label="Cerrar menú de acciones"
        onClick={onCerrar}
      />
      <div
        className="menu-dropdown"
        style={{ top, left }}
        role="menu"
        aria-label={`Acciones de ${nombreEntidad}`}
      >
        <button className="menu-item" type="button" role="menuitem" onClick={onEditar}>
          Editar
        </button>
        <button className="menu-item" type="button" role="menuitem" onClick={onAlternar}>
          {activo ? 'Desactivar' : 'Activar'}
        </button>
        <button
          className="menu-item menu-item-danger"
          type="button"
          role="menuitem"
          onClick={onEliminar}
        >
          Eliminar
        </button>
      </div>
    </>
  )
}

export default MenuAcciones
