import { useEffect, useRef, useState, type FormEvent } from 'react'
import Modal from '@shared/ui/Modal/Modal'
import type { CrearUsuarioPayload, RolResumen } from '@shared/api'
import type { Organizacion } from '@features/organizaciones/api/organizaciones'
import type { Galpon } from '@features/galpones/api/galpones'
import { IcEye, IcEyeOff } from '@shared/ui/icons/icons'
import type { CampoValidado, ErroresUsuario } from '../model/validacionUsuario'

type Props = {
  form: CrearUsuarioPayload
  modoEdicion: boolean
  guardando: boolean
  error: string
  errores?: ErroresUsuario
  verPassword: boolean
  roles: RolResumen[]
  organizaciones: Organizacion[]
  rolBloqueado: boolean
  titulo: string
  esPropietario?: boolean
  galpones?: Galpon[]
  onCambiar: <K extends keyof CrearUsuarioPayload>(
    campo: K,
    valor: CrearUsuarioPayload[K],
  ) => void
  onAlternarPassword: () => void
  onGuardar: (evento: FormEvent) => void
  onCerrar: () => void
}

const ID_FORMULARIO = 'formulario-usuario'

function FormularioUsuario({
  form,
  modoEdicion,
  guardando,
  error,
  errores = {},
  verPassword,
  roles,
  organizaciones,
  rolBloqueado,
  titulo,
  esPropietario = false,
  galpones = [],
  onCambiar,
  onAlternarPassword,
  onGuardar,
  onCerrar,
}: Props) {
  const nombreRef = useRef<HTMLInputElement>(null)
  // Recuadro rojo y mensaje debajo del campo que falló (QA 17-nov).
  const marcar = (campo: CampoValidado) => ({
    'aria-invalid': errores[campo] ? true : undefined,
    'aria-describedby': errores[campo] ? `usuarios-${campo}-error` : undefined,
  })
  const avisoDe = (campo: CampoValidado) =>
    errores[campo] ? (
      <small id={`usuarios-${campo}-error`} className="modal-error modal-error--campo" role="alert">
        {errores[campo]}
      </small>
    ) : null
  const rolSeleccionado = roles.find((rol) => rol.id === form.rol_id)
  const solicitaOrganizacion = !modoEdicion && !rolBloqueado && !esPropietario && rolSeleccionado?.nombre === 'Operario'
  const permiteNombreOrganizacion =
    !modoEdicion && !rolBloqueado && !esPropietario && rolSeleccionado?.nombre === 'Propietario'
  const ayudaRol = rolBloqueado || esPropietario
    ? ''
    : rolSeleccionado?.nombre === 'Administrador'
      ? 'Tendrá acceso general a la organización y a sus módulos de gestión.'
      : rolSeleccionado?.nombre === 'Propietario'
        ? 'Se creará su organización si no indicas un nombre para ella.'
        : rolSeleccionado?.nombre === 'Operario'
          ? 'Debes indicar la organización donde trabajará.'
          : 'Selecciona el tipo de acceso antes de completar los datos.'

  const sinGalponesSeleccionados = esPropietario && (!form.galpon_ids || form.galpon_ids.length === 0)
  const botonDeshabilitado = guardando || (esPropietario && (sinGalponesSeleccionados || galpones.length === 0))

  // Si el Administrador no tiene ninguna organización creada todavía, no
  // tiene sentido mostrarle un desplegable vacío que lo obliga a elegir
  // algo que no existe — se le deja escribir el nombre y se crea sola.
  // Con organizaciones ya creadas, puede elegir una existente o crear otra.
  const [organizacionNueva, setOrganizacionNueva] = useState(organizaciones.length === 0)
  const pideNombreOrganizacion = solicitaOrganizacion && (organizaciones.length === 0 || organizacionNueva)

  useEffect(() => {
    nombreRef.current?.focus()
  }, [])

  return (
    <Modal
      titulo={titulo}
      onCerrar={onCerrar}
      acciones={
        <>
          <button type="button" className="modal-btn" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </button>
          <button
            type="submit"
            form={ID_FORMULARIO}
            className="modal-btn modal-btn--primary"
            disabled={botonDeshabilitado}
          >
            {guardando ? 'Guardando…' : modoEdicion ? 'Guardar cambios' : 'Crear usuario'}
          </button>
        </>
      }
    >
      <form id={ID_FORMULARIO} className="usuarios-form" onSubmit={onGuardar}>
        {!modoEdicion && !esPropietario && (
          <>
            <label className="modal-campo">
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

            {ayudaRol && (
              <p id="usuarios-ayuda-rol" className="usuarios-rol-ayuda">
                {ayudaRol}
              </p>
            )}
          </>
        )}

        {esPropietario && (
          <div className="modal-campo">
            <span id="label-galpones-asignados">
              Galpón(es) asignado(s) <span style={{ color: 'var(--danger)' }}>*</span>
            </span>
            {galpones.length === 0 ? (
              <div
                style={{
                  padding: 'var(--space-3)',
                  background: 'var(--surface-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--border-default)',
                }}
              >
                <p style={{ margin: '0 0 var(--space-2) 0', fontSize: '0.9rem' }}>
                  Aún no tienes galpones creados en tus granjas. Primero debes registrar al menos un galpón antes de asignar operarios.
                </p>
                <a
                  href="/granjas"
                  className="adm-btn adm-btn--secundario"
                  style={{ display: 'inline-flex', padding: 'var(--space-1) var(--space-3)', fontSize: '0.85rem' }}
                >
                  Ir a Granjas y Galpones
                </a>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-2)',
                  maxHeight: '160px',
                  overflowY: 'auto',
                  padding: 'var(--space-2)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--surface-base)',
                }}
                role="group"
                aria-labelledby="label-galpones-asignados"
              >
                {galpones.map((g) => {
                  const check = (form.galpon_ids ?? []).includes(g.id)
                  return (
                    <label
                      key={g.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={check}
                        onChange={(e) => {
                          const actuales = form.galpon_ids ?? []
                          const nuevos = e.target.checked
                            ? [...actuales, g.id]
                            : actuales.filter((id) => id !== g.id)
                          onCambiar('galpon_ids', nuevos)
                        }}
                      />
                      <span>
                        <strong>{g.nombre}</strong> <span style={{ color: 'var(--text-muted)' }}>({g.granja?.nombre ?? 'Granja'})</span>
                      </span>
                    </label>
                  )
                })}
              </div>
            )}
            {sinGalponesSeleccionados && galpones.length > 0 && (
              <small style={{ color: 'var(--danger)', marginTop: 'var(--space-1)', display: 'block' }}>
                Debes asignar al menos un galpón obligatoriamente.
              </small>
            )}
          </div>
        )}

        <label className="modal-campo">
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
          <label className="modal-campo">
            <span>Cédula</span>
            <input
              value={form.cedula}
              onChange={(evento) => onCambiar('cedula', evento.target.value)}
              inputMode="numeric"
              maxLength={10}
              placeholder="Solo números"
              {...marcar('cedula')}
              required
            />
            {avisoDe('cedula')}
          </label>
          <label className="modal-campo">
            <span>Teléfono <em>(Opcional)</em></span>
            <input
              value={form.telefono ?? ''}
              onChange={(evento) => onCambiar('telefono', evento.target.value)}
              inputMode="tel"
              autoComplete="tel"
              placeholder="Ej.: 3001234567"
              {...marcar('telefono')}
            />
            {avisoDe('telefono')}
          </label>
        </div>

        {solicitaOrganizacion && (
          <label className="modal-campo">
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
          <label className="modal-campo">
            <span>Nombre de la organización <em>(Opcional)</em></span>
            <input
              value={form.organizacion_nombre ?? ''}
              onChange={(evento) => onCambiar('organizacion_nombre', evento.target.value)}
            />
          </label>
        )}

        <label className="modal-campo">
          <span>Usuario de acceso</span>
          <input
            value={form.username}
            onChange={(evento) => onCambiar('username', evento.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            minLength={3}
            maxLength={30}
            pattern="[A-Za-z0-9][A-Za-z0-9._\-]{2,29}"
            aria-describedby="usuarios-username-ayuda"
            required
          />
          <small id="usuarios-username-ayuda" className="modal-ayuda">
            De 3 a 30 caracteres: letras sin tildes, números, punto, guion o guion bajo.
            Se guarda en minúsculas. Entrégalo junto con la contraseña.
          </small>
        </label>

        <label className="modal-campo">
          <span>Correo electrónico <em>(Opcional)</em></span>
          <input
            type="email"
            value={form.email ?? ''}
            onChange={(evento) => onCambiar('email', evento.target.value)}
            autoComplete="email"
            placeholder="nombre@dominio.com"
            {...marcar('email')}
          />
          {avisoDe('email')}
        </label>

        {!modoEdicion && (
          <label className="modal-campo">
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
          <label className="modal-campo">
            <span>Rol</span>
            <select value={form.rol_id} disabled aria-label="Rol actual">
              {roles.map((rol) => <option key={rol.id} value={rol.id}>{rol.nombre}</option>)}
            </select>
            <button
              type="button"
              className="usuarios-link-btn"
              onClick={() => { setOrganizacionNueva(true); onCambiar('organizacion_id', undefined) }}
            >
              + Crear una organización nueva
            </button>
          </label>
        )}

        {pideNombreOrganizacion && (
          <label className="modal-campo">
            <span>Nombre de la organización</span>
            <input
              value={form.organizacion_nombre ?? ''}
              onChange={(evento) => onCambiar('organizacion_nombre', evento.target.value)}
              placeholder="Ej: Avícola La Esperanza"
              required
            />
            {organizaciones.length > 0 && (
              <button
                type="button"
                className="usuarios-link-btn"
                onClick={() => { setOrganizacionNueva(false); onCambiar('organizacion_nombre', undefined) }}
              >
                Elegir una organización existente
              </button>
            )}
          </label>
        )}

        {error && <p className="modal-error" role="alert">{error}</p>}

      </form>
    </Modal>
  )
}

export default FormularioUsuario
