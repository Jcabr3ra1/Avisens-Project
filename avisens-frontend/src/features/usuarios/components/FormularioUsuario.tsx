import { useEffect, useRef, type FormEvent } from 'react'
import type { CrearUsuarioPayload, Organizacion, RolResumen } from '@shared/api'
import { IcEye, IcEyeOff } from '@shared/ui/icons/icons'

type Props = {
  form: CrearUsuarioPayload
  modoEdicion: boolean
  guardando: boolean
  error: string
  verPassword: boolean
  roles: RolResumen[]
  organizaciones: Organizacion[]
  rolBloqueado: boolean
  titulo: string
  onCambiar: <K extends keyof CrearUsuarioPayload>(
    campo: K,
    valor: CrearUsuarioPayload[K],
  ) => void
  onAlternarPassword: () => void
  onGuardar: (evento: FormEvent) => void
  onCerrar: () => void
}

function FormularioUsuario({
  form,
  modoEdicion,
  guardando,
  error,
  verPassword,
  roles,
  organizaciones,
  rolBloqueado,
  titulo,
  onCambiar,
  onAlternarPassword,
  onGuardar,
  onCerrar,
}: Props) {
  const nombreRef = useRef<HTMLInputElement>(null)
  const rolSeleccionado = roles.find((rol) => rol.id === form.rol_id)
  const solicitaOrganizacion = !modoEdicion && !rolBloqueado && rolSeleccionado?.nombre === 'Operario'
  const permiteNombreOrganizacion =
    !modoEdicion && !rolBloqueado && rolSeleccionado?.nombre === 'Propietario'
  const ayudaRol = rolBloqueado
    ? 'Crearás una cuenta de Operario para tu organización.'
    : rolSeleccionado?.nombre === 'Administrador'
      ? 'Tendrá acceso general a la organización y a sus módulos de gestión.'
      : rolSeleccionado?.nombre === 'Propietario'
        ? 'Se creará su organización si no indicas un nombre para ella.'
        : rolSeleccionado?.nombre === 'Operario'
          ? 'Debes indicar la organización donde trabajará.'
          : 'Selecciona el tipo de acceso antes de completar los datos.'

  useEffect(() => {
    nombreRef.current?.focus()
    const cerrarConEscape = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', cerrarConEscape)
    return () => window.removeEventListener('keydown', cerrarConEscape)
  }, [onCerrar])

  return (
    <div className="usuarios-modal-overlay" onMouseDown={onCerrar}>
      <div
        className="usuarios-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="usuarios-modal-titulo"
        onMouseDown={(evento) => evento.stopPropagation()}
      >
        <h2 id="usuarios-modal-titulo" className="usuarios-modal-titulo">{titulo}</h2>

        <form className="usuarios-form" onSubmit={onGuardar}>
          {!modoEdicion && (
            <>
              <label className="usuarios-campo">
                <span>Tipo de cuenta</span>
                <select
                  value={form.rol_id}
                  onChange={(evento) => onCambiar('rol_id', Number(evento.target.value))}
                  disabled={rolBloqueado}
                  aria-describedby="usuarios-ayuda-rol"
                  required
                >
                  {!form.rol_id && <option value="">Selecciona un rol</option>}
                  {roles.map((rol) => <option key={rol.id} value={rol.id}>{rol.nombre}</option>)}
                </select>
              </label>

              <p id="usuarios-ayuda-rol" className="usuarios-rol-ayuda">
                {ayudaRol}
              </p>
            </>
          )}

          <label className="usuarios-campo">
            <span>Nombre completo</span>
            <input
              ref={nombreRef}
              value={form.nombre_completo}
              onChange={(evento) => onCambiar('nombre_completo', evento.target.value)}
              autoComplete="name"
              required
            />
          </label>

          <div className="usuarios-campo-fila">
            <label className="usuarios-campo">
              <span>Cédula</span>
              <input
                value={form.cedula}
                onChange={(evento) => onCambiar('cedula', evento.target.value)}
                inputMode="numeric"
                required
              />
            </label>
            <label className="usuarios-campo">
              <span>Teléfono <em>(opcional)</em></span>
              <input
                value={form.telefono ?? ''}
                onChange={(evento) => onCambiar('telefono', evento.target.value)}
                inputMode="tel"
                autoComplete="tel"
              />
            </label>
          </div>

          {solicitaOrganizacion && (
            <label className="usuarios-campo">
              <span>Organización donde trabajará</span>
              <select
                value={form.organizacion_id ?? ''}
                onChange={(evento) =>
                  onCambiar(
                    'organizacion_id',
                    evento.target.value ? Number(evento.target.value) : undefined,
                  )
                }
                required
              >
                <option value="">Selecciona una organización</option>
                {organizaciones.map((organizacion) => (
                  <option key={organizacion.id} value={organizacion.id}>{organizacion.nombre}</option>
                ))}
              </select>
            </label>
          )}

          {permiteNombreOrganizacion && (
            <label className="usuarios-campo">
              <span>Nombre de la organización <em>(opcional)</em></span>
              <input
                value={form.organizacion_nombre ?? ''}
                onChange={(evento) => onCambiar('organizacion_nombre', evento.target.value)}
              />
            </label>
          )}

          <label className="usuarios-campo">
            <span>Correo electrónico</span>
            <input
              type="email"
              value={form.email}
              onChange={(evento) => onCambiar('email', evento.target.value)}
              autoComplete="email"
              required
            />
          </label>

          {!modoEdicion && (
            <label className="usuarios-campo">
              <span>Contraseña <em>(mínimo 8 caracteres)</em></span>
              <div className="usuarios-password">
                <input
                  type={verPassword ? 'text' : 'password'}
                  minLength={8}
                  value={form.password}
                  onChange={(evento) => onCambiar('password', evento.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={onAlternarPassword}
                  aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  title={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {verPassword ? <IcEyeOff size={17} /> : <IcEye size={17} />}
                </button>
              </div>
            </label>
          )}

          {modoEdicion && (
            <label className="usuarios-campo">
              <span>Rol</span>
              <select value={form.rol_id} disabled aria-label="Rol actual">
                {roles.map((rol) => <option key={rol.id} value={rol.id}>{rol.nombre}</option>)}
              </select>
            </label>
          )}

          {error && <p className="usuarios-modal-error" role="alert">{error}</p>}

          <div className="usuarios-modal-acciones">
            <button
              type="button"
              className="usuarios-btn-secundario"
              onClick={onCerrar}
              disabled={guardando}
            >
              Cancelar
            </button>
            <button type="submit" className="usuarios-btn-primary" disabled={guardando}>
              {guardando ? 'Guardando…' : modoEdicion ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default FormularioUsuario
