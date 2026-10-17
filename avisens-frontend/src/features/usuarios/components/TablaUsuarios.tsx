import { useEffect, useState } from 'react'
import type { Usuario } from '@shared/api'
import { IcPlus, IcSearch, IcUsers } from '@shared/ui/icons/icons'
import type { FiltroRolUsuario } from '../hooks/useFiltroUsuarios'
import FilaUsuario from './FilaUsuario'

type PosicionMenu = { usuario: Usuario; top: number; left: number }

type RolSeccion = {
  rol: 'Administrador' | 'Propietario' | 'Operario'
  titulo: string
  subtitulo: string
  botonCrear: string
  vacio: string
  tono: 'administrador' | 'propietario' | 'operario'
}

const SECCIONES_ROL: RolSeccion[] = [
  {
    rol: 'Administrador',
    titulo: 'Administradores',
    subtitulo: 'Gobierno global de la plataforma, organizaciones, catálogos y soporte',
    botonCrear: 'Nuevo administrador',
    vacio: 'No hay administradores registrados en este filtro.',
    tono: 'administrador',
  },
  {
    rol: 'Propietario',
    titulo: 'Propietarios',
    subtitulo: 'Titulares de empresas avícolas, responsables de granjas, lotes y finanzas',
    botonCrear: 'Nuevo propietario',
    vacio: 'Aún no hay propietarios registrados.',
    tono: 'propietario',
  },
  {
    rol: 'Operario',
    titulo: 'Operarios',
    subtitulo: 'Personal de campo asignado a galpones para pesajes, consumos y mortalidad',
    botonCrear: 'Nuevo operario',
    vacio: 'Aún no hay operarios registrados.',
    tono: 'operario',
  },
]

const COLUMNAS = ['Persona', 'Contacto', 'Cédula', 'Acceso']

type Props = {
  usuarios: Usuario[]
  visibles: Usuario[]
  cargando: boolean
  busqueda: string
  esPropietario: boolean
  rolFiltro: FiltroRolUsuario
  onCrearPorRol: (nombreRol: 'Administrador' | 'Propietario' | 'Operario') => void
  onAlternarActivo: (usuario: Usuario) => void
  onEditar: (usuario: Usuario) => void
  onGestionarAsignaciones: (usuario: Usuario) => void
  onEliminar: (usuario: Usuario) => void
  onRecuperarAcceso?: (usuario: Usuario) => void
}

function TablaUsuarios({
  usuarios,
  visibles,
  cargando,
  busqueda,
  esPropietario,
  rolFiltro,
  onCrearPorRol,
  onAlternarActivo,
  onEditar,
  onGestionarAsignaciones,
  onEliminar,
  onRecuperarAcceso,
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
    const ancho = 190
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
    return <p className="usuarios-empty" role="status">Cargando personas y roles…</p>
  }

  if (usuarios.length === 0) {
    return (
      <div className="usuarios-vacio">
        <IcUsers size={30} />
        <p className="usuarios-vacio-titulo">No hay personas registradas.</p>
        <p className="usuarios-vacio-sub">Crea la primera cuenta con el botón superior.</p>
      </div>
    )
  }

  if (busqueda.trim() && visibles.length === 0) {
    return (
      <div className="usuarios-vacio">
        <IcSearch size={26} />
        <p className="usuarios-vacio-titulo">Sin resultados para “{busqueda}”</p>
        <p className="usuarios-vacio-sub">Prueba con otro nombre, usuario, correo o cédula.</p>
      </div>
    )
  }

  const seccionesVisibles = esPropietario
    ? SECCIONES_ROL.filter((s) => s.rol === 'Operario')
    : rolFiltro === 'todos'
      ? SECCIONES_ROL
      : SECCIONES_ROL.filter((s) => s.rol === rolFiltro)

  return (
    <>
      <div className="usuarios-roles-stack">
        {seccionesVisibles.map((seccion) => {
          const cuentasRol = visibles.filter((u) => u.rol.nombre === seccion.rol)
          const activasRol = cuentasRol.filter((u) => u.activo).length

          return (
            <section
              key={seccion.rol}
              className={`usuarios-rol-group usuarios-rol-group--${seccion.tono}`}
              aria-label={seccion.titulo}
            >
              <header className="usuarios-rol-group-head">
                <div className="usuarios-rol-group-info">
                  <div className="usuarios-rol-group-title-row">
                    <span className={`usuarios-rol-dot usuarios-rol-dot--${seccion.tono}`} aria-hidden="true" />
                    <h3>{seccion.titulo}</h3>
                    <span className="usuarios-rol-count">
                      {cuentasRol.length} {cuentasRol.length === 1 ? 'cuenta' : 'cuentas'}
                      {cuentasRol.length > 0 ? ` · ${activasRol} ${activasRol === 1 ? 'activa' : 'activas'}` : ''}
                    </span>
                  </div>
                  <p>{seccion.subtitulo}</p>
                </div>

                <button
                  type="button"
                  className="usuarios-rol-add-btn"
                  onClick={() => onCrearPorRol(seccion.rol)}
                >
                  <IcPlus size={14} aria-hidden="true" />
                  <span>{seccion.botonCrear}</span>
                </button>
              </header>

              {cuentasRol.length === 0 ? (
                <div className="usuarios-rol-empty">
                  <span>{seccion.vacio}</span>
                  <button
                    type="button"
                    className="usuarios-rol-empty-action"
                    onClick={() => onCrearPorRol(seccion.rol)}
                  >
                    Registrar {seccion.rol.toLowerCase()}
                  </button>
                </div>
              ) : (
                <div className="usuarios-tabla-scroll">
                  <table className="usuarios-table">
                    <thead>
                      <tr>
                        {COLUMNAS.map((columna) => <th key={columna}>{columna}</th>)}
                        <th aria-label="Acciones" />
                      </tr>
                    </thead>
                    <tbody>
                      {cuentasRol.map((usuario) => (
                        <FilaUsuario
                          key={usuario.id}
                          usuario={usuario}
                          onAlternarActivo={onAlternarActivo}
                          onGestionarAsignaciones={onGestionarAsignaciones}
                          onMenu={alternarMenu}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )
        })}
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
              Editar datos
            </button>
            {menu.usuario.rol.nombre === 'Operario' && (
              <button
                type="button"
                role="menuitem"
                onClick={() => ejecutar(onGestionarAsignaciones)}
              >
                Gestionar galpones
              </button>
            )}
            {onRecuperarAcceso && (
              <button
                type="button"
                role="menuitem"
                onClick={() => ejecutar(onRecuperarAcceso)}
              >
                Recuperar acceso
              </button>
            )}
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
