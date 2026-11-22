import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { Usuario } from '@shared/api'
import {
  IcArrowRight,
  IcBarn,
  IcBuilding,
  IcClose,
  IcEdit,
  IcPhone,
  IcRefresh,
  IcSend,
  IcSidebar,
  IcTrash,
  IcUserCircle,
} from '@shared/ui/icons/icons'

type Props = {
  usuario: Usuario | null
  esAdmin: boolean
  abiertoMovil: boolean
  onCerrarMovil: () => void
  onAlternarActivo: (usuario: Usuario) => void
  onEditar: (usuario: Usuario) => void
  onGestionarAsignaciones: (usuario: Usuario) => void
  onRecuperarAcceso?: (usuario: Usuario) => void
  onEliminar: (usuario: Usuario) => void
}

const FECHA_CORTA = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })

function iniciales(nombre: string): string {
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

function formatearFecha(valor: string): string {
  const fecha = new Date(valor)
  return Number.isNaN(fecha.getTime()) ? '' : FECHA_CORTA.format(fecha)
}

function PanelUsuario({
  usuario,
  esAdmin,
  abiertoMovil,
  onCerrarMovil,
  onAlternarActivo,
  onEditar,
  onGestionarAsignaciones,
  onRecuperarAcceso,
  onEliminar,
}: Props) {
  useEffect(() => {
    if (!abiertoMovil) return
    const alPresionarTecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') onCerrarMovil()
    }
    window.addEventListener('keydown', alPresionarTecla)
    return () => window.removeEventListener('keydown', alPresionarTecla)
  }, [abiertoMovil, onCerrarMovil])

  if (!usuario) {
    return (
      <aside className="usr-panel" aria-label="Persona seleccionada">
        <div className="usr-panel-cabecera">
          <IcSidebar size={15} aria-hidden="true" />
          <span>Persona seleccionada</span>
        </div>
        <div className="usr-panel-vacio">
          <IcUserCircle size={28} aria-hidden="true" />
          <p>Selecciona una cuenta de la lista para revisar sus datos y permisos.</p>
        </div>
      </aside>
    )
  }

  const rolClase = usuario.rol.nombre.toLowerCase()
  const esOperario = usuario.rol.nombre === 'Operario'
  const fechaRegistro = formatearFecha(usuario.fecha_creacion)
  const galponesAsignados = usuario.usuarios_galpones?.length ?? 0

  return (
    <>
      {abiertoMovil && (
        <div
          className="usr-panel-fondo"
          aria-hidden="true"
          onClick={onCerrarMovil}
        />
      )}
      <aside
        className={`usr-panel${abiertoMovil ? ' is-abierto-movil' : ''}`}
        aria-label={`Detalle de ${usuario.nombre_completo}`}
      >
        <div className="usr-panel-cabecera">
          <IcSidebar size={15} aria-hidden="true" />
          <span>Persona seleccionada</span>
          <span className={`usr-estado-badge${usuario.activo ? ' is-activo' : ' is-inactivo'}`}>
            {usuario.activo ? 'Activo' : 'Inactivo'}
          </span>
          <button
            type="button"
            className="usr-panel-cerrar"
            onClick={onCerrarMovil}
            aria-label="Cerrar panel de la persona"
          >
            <IcClose size={17} aria-hidden="true" />
          </button>
        </div>

        <div className="usr-panel-cuerpo">
          <header className="usr-panel-identidad">
            <span className={`usuarios-avatar usuarios-avatar--${rolClase} usr-avatar-grande`} aria-hidden="true">
              {iniciales(usuario.nombre_completo)}
            </span>
            <div>
              <h2>{usuario.nombre_completo}</h2>
              <p className="usr-panel-sub">
                <span>@{usuario.username}</span>
                <span className={`usr-rol-pill usr-rol-pill--${rolClase}`}>{usuario.rol.nombre}</span>
              </p>
              {fechaRegistro && <small className="usr-panel-fecha">Registrado el {fechaRegistro}</small>}
            </div>
          </header>

          {(usuario.telefono || usuario.email) && (
            <div className="usr-contacto">
              {usuario.telefono && (
                <a className="usr-contacto-btn" href={`tel:${usuario.telefono}`}>
                  <IcPhone size={15} aria-hidden="true" />
                  Llamar
                </a>
              )}
              {usuario.email && (
                <a className="usr-contacto-btn" href={`mailto:${usuario.email}`}>
                  <IcSend size={15} aria-hidden="true" />
                  Correo
                </a>
              )}
            </div>
          )}

          <div className="usr-acceso-caja">
            <div>
              <strong>Acceso al sistema</strong>
              <small>
                {usuario.activo
                  ? 'Puede iniciar sesión y operar según su rol.'
                  : 'Tiene el ingreso suspendido temporalmente.'}
              </small>
            </div>
            <label className="usuarios-switch">
              <input
                type="checkbox"
                checked={usuario.activo}
                onChange={() => onAlternarActivo(usuario)}
                aria-label={`${usuario.activo ? 'Desactivar' : 'Activar'} a ${usuario.nombre_completo}`}
              />
              <span className="usuarios-switch-slider" />
            </label>
          </div>

          <section className="usr-bloque" aria-label="Información de la cuenta">
            <h3>Datos de la cuenta</h3>
            <dl className="usr-datos">
              <div>
                <dt>Cédula</dt>
                <dd>{usuario.cedula}</dd>
              </div>
              <div>
                <dt>Teléfono</dt>
                <dd>{usuario.telefono || 'No registrado'}</dd>
              </div>
              <div className="usr-datos-ancho">
                <dt>Correo</dt>
                <dd>{usuario.email || 'No registrado'}</dd>
              </div>
              <div className="usr-datos-ancho">
                <dt>Organización</dt>
                <dd>
                  {usuario.organizacion ? (
                    esAdmin ? (
                      <Link to={`/organizaciones/${usuario.organizacion.id}`} className="usr-org-enlace">
                        <IcBuilding size={14} aria-hidden="true" />
                        <span>{usuario.organizacion.nombre}</span>
                        <IcArrowRight size={13} aria-hidden="true" />
                      </Link>
                    ) : (
                      usuario.organizacion.nombre
                    )
                  ) : (
                    'Plataforma global'
                  )}
                </dd>
              </div>
            </dl>
          </section>

          <section className="usr-bloque" aria-label="Acciones rápidas">
            <h3>Gestión</h3>
            <div className="usr-acciones">
              <button
                type="button"
                className="usr-accion-btn usr-accion-btn--primario"
                onClick={() => onEditar(usuario)}
              >
                <IcEdit size={15} aria-hidden="true" />
                Editar datos
              </button>

              {esOperario && (
                <button
                  type="button"
                  className="usr-accion-btn"
                  onClick={() => onGestionarAsignaciones(usuario)}
                >
                  <IcBarn size={15} aria-hidden="true" />
                  Gestionar galpones
                  {galponesAsignados > 0 && <span className="usr-accion-conteo">{galponesAsignados}</span>}
                </button>
              )}

              {onRecuperarAcceso && (
                <button
                  type="button"
                  className="usr-accion-btn"
                  onClick={() => onRecuperarAcceso(usuario)}
                >
                  <IcRefresh size={15} aria-hidden="true" />
                  Recuperar acceso
                </button>
              )}
            </div>
          </section>

          <section className="usr-zona-peligro" aria-label="Zona de peligro">
            <button
              type="button"
              className="usr-boton-eliminar"
              onClick={() => onEliminar(usuario)}
            >
              <IcTrash size={14} aria-hidden="true" />
              Eliminar usuario
            </button>
          </section>
        </div>
      </aside>
    </>
  )
}

export default PanelUsuario
