import { useEffect, useState } from 'react'
import type { Usuario } from '@shared/api'
import { IcSearch, IcUsers } from '@shared/ui/icons/icons'
import FilaUsuario from './FilaUsuario'

type PosicionMenu = { usuario: Usuario; top: number; left: number }

type Props = {
  usuarios: Usuario[]
  visibles: Usuario[]
  cargando: boolean
  busqueda: string
  onAlternarActivo: (usuario: Usuario) => void
  onEditar: (usuario: Usuario) => void
  onEliminar: (usuario: Usuario) => void
}

const COLUMNAS = ['Nombre', 'Correo', 'Cédula', 'Teléfono', 'Rol', 'Estado']

function TablaUsuarios({
  usuarios,
  visibles,
  cargando,
  busqueda,
  onAlternarActivo,
  onEditar,
  onEliminar,
}: Props) {
  const [menu, setMenu] = useState<PosicionMenu | null>(null)

  useEffect(() => {
    if (!menu) return
    const cerrarConEscape = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setMenu(null)
    }
    window.addEventListener('keydown', cerrarConEscape)
    return () => window.removeEventListener('keydown', cerrarConEscape)
  }, [menu])

  function alternarMenu(evento: React.MouseEvent, usuario: Usuario) {
    if (menu?.usuario.id === usuario.id) {
      setMenu(null)
      return
    }
    const rectangulo = (evento.currentTarget as HTMLElement).getBoundingClientRect()
    const ancho = 160
    setMenu({
      usuario,
      top: rectangulo.bottom + 4,
      left: Math.max(8, Math.min(rectangulo.right - ancho, window.innerWidth - ancho - 8)),
    })
  }

  function ejecutar(accion: (usuario: Usuario) => void) {
    if (!menu) return
    const usuario = menu.usuario
    setMenu(null)
    accion(usuario)
  }

  if (cargando) {
    return <p className="usuarios-empty" role="status">Cargando usuarios…</p>
  }

  if (usuarios.length === 0) {
    return (
      <div className="usuarios-vacio">
        <IcUsers size={32} />
        <p className="usuarios-vacio-titulo">No hay usuarios registrados.</p>
        <p className="usuarios-vacio-sub">Crea el primero con el botón de arriba.</p>
      </div>
    )
  }

  if (visibles.length === 0) {
    return (
      <div className="usuarios-vacio">
        <IcSearch size={28} />
        <p className="usuarios-vacio-titulo">Sin resultados para “{busqueda}”</p>
        <p className="usuarios-vacio-sub">Prueba con otro nombre, correo o cédula.</p>
      </div>
    )
  }

  return (
    <>
      <div className="usuarios-tabla-scroll">
        <table className="usuarios-table">
          <thead>
            <tr>
              {COLUMNAS.map((columna) => <th key={columna}>{columna}</th>)}
              <th aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            {visibles.map((usuario) => (
              <FilaUsuario
                key={usuario.id}
                usuario={usuario}
                onAlternarActivo={onAlternarActivo}
                onMenu={alternarMenu}
              />
            ))}
          </tbody>
        </table>
      </div>

      {menu && (
        <>
          <button
            type="button"
            className="usuarios-menu-overlay"
            onClick={() => setMenu(null)}
            aria-label="Cerrar menú de acciones"
          />
          <div
            className="usuarios-menu"
            style={{ top: menu.top, left: menu.left }}
            role="menu"
          >
            <button type="button" role="menuitem" onClick={() => ejecutar(onEditar)}>
              Editar
            </button>
            <button
              type="button"
              role="menuitem"
              className="usuarios-menu-peligro"
              onClick={() => ejecutar(onEliminar)}
            >
              Eliminar
            </button>
          </div>
        </>
      )}
    </>
  )
}

export default TablaUsuarios
