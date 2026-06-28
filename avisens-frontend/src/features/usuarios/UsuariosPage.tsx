import { useEffect, useState, type FormEvent } from 'react'
import { isAxiosError } from 'axios'
import {
  listarUsuarios,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
  getRol,
  type Usuario,
  type CrearUsuarioPayload,
} from '@shared/api'
import './UsuariosPage.css'

// El backend no expone un endpoint de roles, así que los listamos aquí.
// Coinciden con los insertados en database/init/01-init.sql.
const ROLES = [
  { id: 1, nombre: 'Administrador' },
  { id: 2, nombre: 'Propietario' },
  { id: 3, nombre: 'Operario' },
]

const FORM_INICIAL: CrearUsuarioPayload = {
  nombre_completo: '',
  cedula: '',
  email: '',
  password: '',
  telefono: '',
  rol_id: 2,
}

// Traduce un error de axios a un mensaje legible para el usuario.
function mensajeError(err: unknown, fallback: string): string {
  if (isAxiosError(err) && err.response) {
    if (err.response.status === 403) {
      return 'No tienes permisos para esta acción.'
    }
    const data = err.response.data as { message?: string | string[] }
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(', ') : data.message
    }
  }
  return fallback
}

function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [modalAbierto, setModalAbierto] = useState(false)
  // null = creando un usuario nuevo; un id = editando ese usuario.
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [form, setForm] = useState<CrearUsuarioPayload>(FORM_INICIAL)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState('')

  // Menú de acciones (⋯) abierto: guarda la fila y dónde dibujarlo.
  const [menu, setMenu] = useState<{ user: Usuario; top: number; left: number } | null>(null)

  const modoEdicion = editandoId !== null

  // El Propietario solo gestiona operarios; el Admin gestiona todos los roles.
  const esPropietario = getRol() === 'Propietario'
  const rolesDisponibles = esPropietario
    ? ROLES.filter((r) => r.nombre === 'Operario')
    : ROLES

  async function cargarUsuarios() {
    setCargando(true)
    setError('')
    try {
      setUsuarios(await listarUsuarios())
    } catch (err) {
      setError(mensajeError(err, 'No se pudieron cargar los usuarios.'))
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarUsuarios()
  }, [])

  function abrirCrear() {
    setEditandoId(null)
    // Para el Dueño, el rol por defecto (y único) es Operario.
    setForm({ ...FORM_INICIAL, rol_id: esPropietario ? 3 : FORM_INICIAL.rol_id })
    setErrorForm('')
    setModalAbierto(true)
  }

  function abrirEditar(u: Usuario) {
    setEditandoId(u.id)
    setForm({
      nombre_completo: u.nombre_completo,
      cedula: u.cedula,
      email: u.email,
      password: '', // vacío = no cambiar la contraseña
      telefono: u.telefono ?? '',
      rol_id: u.rol.id,
    })
    setErrorForm('')
    setModalAbierto(true)
  }

  function actualizarCampo<K extends keyof CrearUsuarioPayload>(
    campo: K,
    valor: CrearUsuarioPayload[K],
  ) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  async function handleGuardar(e: FormEvent) {
    e.preventDefault()
    setErrorForm('')
    setGuardando(true)
    try {
      const telefono = form.telefono?.trim() || undefined
      if (modoEdicion && editandoId !== null) {
        // En edición solo mandamos la contraseña si el campo no quedó vacío.
        const { password, ...resto } = form
        await actualizarUsuario(editandoId, {
          ...resto,
          telefono,
          ...(password ? { password } : {}),
        })
      } else {
        await crearUsuario({ ...form, telefono })
      }
      setModalAbierto(false)
      await cargarUsuarios()
    } catch (err) {
      setErrorForm(
        mensajeError(err, `No se pudo ${modoEdicion ? 'actualizar' : 'crear'} el usuario.`),
      )
    } finally {
      setGuardando(false)
    }
  }

  // Interruptor de Estado: enciende/apaga la cuenta (borrado lógico).
  async function handleToggleActivo(u: Usuario) {
    try {
      await actualizarUsuario(u.id, { activo: !u.activo })
      await cargarUsuarios()
    } catch (err) {
      setError(mensajeError(err, 'No se pudo cambiar el estado del usuario.'))
    }
  }

  // Borrado permanente (con confirmación).
  async function handleEliminar(u: Usuario) {
    const ok = window.confirm(
      `¿Eliminar PERMANENTEMENTE a ${u.nombre_completo}?\nEsta acción no se puede deshacer.`,
    )
    if (!ok) return
    try {
      await eliminarUsuario(u.id)
      await cargarUsuarios()
    } catch (err) {
      setError(mensajeError(err, 'No se pudo eliminar el usuario.'))
    }
  }

  // Abre el menú ⋯ justo debajo del botón que se pulsó.
  function abrirMenu(e: React.MouseEvent, u: Usuario) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setMenu({ user: u, top: r.bottom + 4, left: r.right - 152 })
  }

  return (
    <div className="page-container usuarios">
      <header className="usuarios-head">
        <div>
          <h1 className="usuarios-title">{esPropietario ? 'Operarios' : 'Usuarios y Roles'}</h1>
          <p className="usuarios-sub">
            {esPropietario
              ? 'Gestiona los operarios de tu granja.'
              : 'Gestiona las cuentas que acceden al sistema.'}
          </p>
        </div>
        <button className="btn-primary" onClick={abrirCrear}>
          + {esPropietario ? 'Nuevo operario' : 'Nuevo usuario'}
        </button>
      </header>

      {error && <div className="usuarios-alert" role="alert">{error}</div>}

      <div className="usuarios-card">
        {cargando ? (
          <p className="usuarios-empty">Cargando usuarios…</p>
        ) : usuarios.length === 0 ? (
          <p className="usuarios-empty">No hay usuarios registrados.</p>
        ) : (
          <table className="usuarios-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Cédula</th>
                <th>Teléfono</th>
                <th>Rol</th>
                <th>Estado</th>
                <th aria-label="Acciones"></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className={u.activo ? '' : 'is-inactive'}>
                  <td>{u.nombre_completo}</td>
                  <td>{u.email}</td>
                  <td>{u.cedula}</td>
                  <td>{u.telefono ?? '—'}</td>
                  <td><span className="rol-badge">{u.rol.nombre}</span></td>
                  <td>
                    <label className="switch" title={u.activo ? 'Desactivar' : 'Activar'}>
                      <input
                        type="checkbox"
                        checked={u.activo}
                        onChange={() => handleToggleActivo(u)}
                      />
                      <span className="switch-slider" />
                    </label>
                    <span className={`estado-text ${u.activo ? 'activo' : 'inactivo'}`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="col-acciones">
                    <button
                      className="btn-kebab"
                      onClick={(e) => (menu?.user.id === u.id ? setMenu(null) : abrirMenu(e, u))}
                      aria-label="Acciones"
                    >
                      ⋯
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {menu && (
        <>
          <div className="menu-overlay" onClick={() => setMenu(null)} />
          <div className="menu-dropdown" style={{ top: menu.top, left: menu.left }}>
            <button
              className="menu-item"
              onClick={() => { const u = menu.user; setMenu(null); abrirEditar(u) }}
            >
              Editar
            </button>
            <button
              className="menu-item menu-item-danger"
              onClick={() => { const u = menu.user; setMenu(null); handleEliminar(u) }}
            >
              Eliminar
            </button>
          </div>
        </>
      )}

      {modalAbierto && (
        <div className="modal-overlay" onClick={() => setModalAbierto(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">
              {modoEdicion
                ? esPropietario ? 'Editar operario' : 'Editar usuario'
                : esPropietario ? 'Nuevo operario' : 'Nuevo usuario'}
            </h2>

            <form className="modal-form" onSubmit={handleGuardar}>
              <label className="campo">
                <span>Nombre completo</span>
                <input
                  value={form.nombre_completo}
                  onChange={(e) => actualizarCampo('nombre_completo', e.target.value)}
                  required
                />
              </label>

              <div className="campo-fila">
                <label className="campo">
                  <span>Cédula</span>
                  <input
                    value={form.cedula}
                    onChange={(e) => actualizarCampo('cedula', e.target.value)}
                    required
                  />
                </label>
                <label className="campo">
                  <span>Teléfono <em>(opcional)</em></span>
                  <input
                    value={form.telefono}
                    onChange={(e) => actualizarCampo('telefono', e.target.value)}
                  />
                </label>
              </div>

              <label className="campo">
                <span>Correo electrónico</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => actualizarCampo('email', e.target.value)}
                  required
                />
              </label>

              <div className="campo-fila">
                <label className="campo">
                  <span>
                    Contraseña{' '}
                    <em>{modoEdicion ? '(vacío = sin cambio)' : '(mín. 8)'}</em>
                  </span>
                  <input
                    type="password"
                    minLength={8}
                    placeholder={modoEdicion ? '••••••••' : ''}
                    value={form.password}
                    onChange={(e) => actualizarCampo('password', e.target.value)}
                    required={!modoEdicion}
                  />
                </label>
                <label className="campo">
                  <span>Rol</span>
                  <select
                    value={form.rol_id}
                    onChange={(e) => actualizarCampo('rol_id', Number(e.target.value))}
                    disabled={esPropietario}
                  >
                    {rolesDisponibles.map((r) => (
                      <option key={r.id} value={r.id}>{r.nombre}</option>
                    ))}
                  </select>
                </label>
              </div>

              {errorForm && <p className="modal-error" role="alert">{errorForm}</p>}

              <div className="modal-acciones">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setModalAbierto(false)}
                  disabled={guardando}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={guardando}>
                  {guardando
                    ? 'Guardando…'
                    : modoEdicion
                      ? 'Guardar cambios'
                      : 'Crear usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default UsuariosPage
