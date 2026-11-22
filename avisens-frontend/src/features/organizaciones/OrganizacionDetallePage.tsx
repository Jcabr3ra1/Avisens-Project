import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { getRol } from '@shared/api'
import { permisosDeGestion } from '@shared/auth/permisos'
import { confirmarAccion } from '@shared/ui/ConfirmarAccion/gestorConfirmacion'
import CabeceraAdmin from '@shared/ui/admin/CabeceraAdmin'
import { useRefetchOnFocus } from '@shared/hooks/useRefetchOnFocus'
import { IcArrowRight, IcChat, IcChevronRight, IcLeaf, IcUsers } from '@shared/ui/icons/icons'
import { mensajeDeError } from '@shared/utils/errores'
import {
  activarOrganizacion,
  actualizarOrganizacion,
  desactivarOrganizacion,
  obtenerDetalleOrganizacion,
  type CrearOrganizacionPayload,
  type OrganizacionDetalle,
} from './api/organizaciones'
import EliminarOrganizacion from './components/EliminarOrganizacion'
import EstructuraOrganizacion from './components/EstructuraOrganizacion'
import FormularioOrganizacion from './components/FormularioOrganizacion'
import HeroOrganizacion from './components/HeroOrganizacion'
import '@shared/ui/admin/AdminKit.css'
import '@shared/ui/movimiento.css'
import './OrganizacionDetallePage.css'

type Pestana = 'granjas' | 'personas' | 'soporte'

function fechaCorta(valor: string | null): string {
  if (!valor) return 'Sin registro'
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(valor))
}

const RESUMEN_SOPORTE = [
  { etiqueta: 'Abiertas', estados: ['abierta'] },
  { etiqueta: 'En proceso', estados: ['en_proceso'] },
  { etiqueta: 'Resueltas', estados: ['resuelta', 'cerrada'] },
]

function etiquetaEstado(estado: string): string {
  const etiquetas: Record<string, string> = {
    pendiente: 'Pendiente',
    aprobada: 'Aprobada',
    rechazada: 'Rechazada',
    completada: 'Completada',
    abierta: 'Abierta',
    en_proceso: 'En proceso',
    resuelta: 'Resuelta',
    cerrada: 'Cerrada',
  }
  return etiquetas[estado] ?? estado.replace(/_/g, ' ')
}

function EsqueletoFicha() {
  return (
    <div className="org-expediente" role="status">
      <span className="sr-only">Cargando el cliente…</span>
      <div className="org-esqueleto-perfil org-brilla" aria-hidden="true" />
      <div className="org-esqueleto-espacio" aria-hidden="true">
        <div className="org-esqueleto-tabs org-brilla" />
        <div className="org-esqueleto-grid">
          <div className="org-esqueleto-card org-brilla" />
          <div className="org-esqueleto-card org-brilla" />
        </div>
      </div>
    </div>
  )
}

function OrganizacionDetallePage() {
  const { id: idTexto } = useParams()
  const navigate = useNavigate()
  const puedeGestionar = permisosDeGestion(getRol()).crear
  const id = Number(idTexto)
  const [pestana, setPestana] = useState<Pestana>('granjas')
  const [granjaActivaId, setGranjaActivaId] = useState<number | null>(null)
  const [detalle, setDetalle] = useState<OrganizacionDetalle | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [avisoActualizacion, setAvisoActualizacion] = useState('')
  const [editando, setEditando] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const secuenciaCarga = useRef(0)

  const actualizarResumen = useCallback(async () => {
    if (!Number.isInteger(id) || id <= 0) return
    const version = secuenciaCarga.current
    try {
      const actualizado = await obtenerDetalleOrganizacion(id)
      if (version !== secuenciaCarga.current) return
      setDetalle(actualizado)
      setAvisoActualizacion('')
    } catch {
      if (version !== secuenciaCarga.current) return
      setAvisoActualizacion('El cambio se guardó, pero no se pudo actualizar el resumen. Recarga la página para volver a consultarlo.')
    }
  }, [id])

  const cargar = useCallback(async () => {
    const version = ++secuenciaCarga.current
    setDetalle(null)
    setGranjaActivaId(null)
    setAvisoActualizacion('')
    if (!Number.isInteger(id) || id <= 0) {
      setError('El identificador del cliente no es válido.')
      setCargando(false)
      return
    }
    setCargando(true)
    setError('')
    try {
      const actualizado = await obtenerDetalleOrganizacion(id)
      if (version === secuenciaCarga.current) setDetalle(actualizado)
    } catch (problema) {
      if (version === secuenciaCarga.current) setError(mensajeDeError(problema, 'No se pudo cargar el cliente.'))
    } finally {
      if (version === secuenciaCarga.current) setCargando(false)
    }
  }, [id])

  useEffect(() => {
    void cargar()
    return () => { secuenciaCarga.current += 1 }
  }, [cargar])

  useRefetchOnFocus(actualizarResumen)

  const elegirGranja = useCallback((granjaId: number) => {
    setGranjaActivaId(granjaId)
    setPestana('granjas')
  }, [])

  const guardarEdicion = useCallback(async (payload: CrearOrganizacionPayload) => {
    await actualizarOrganizacion(id, payload)
    await actualizarResumen()
    toast.success('Datos del cliente actualizados')
  }, [id, actualizarResumen])

  const alternarEstado = useCallback(async () => {
    if (!detalle) return
    if (detalle.activa && !(await confirmarAccion({
      titulo: '¿Suspender este cliente?',
      entidad: detalle.nombre,
      descripcion: 'Sus usuarios dejarán de poder entrar. La información se conserva.',
      textoConfirmar: 'Suspender cliente',
      tono: 'aviso',
    }))) return
    try {
      if (detalle.activa) await desactivarOrganizacion(detalle.id)
      else await activarOrganizacion(detalle.id)
      await actualizarResumen()
      toast.success(detalle.activa ? `${detalle.nombre} queda suspendida` : `${detalle.nombre} vuelve a estar activa`)
    } catch (problema) {
      toast.error(mensajeDeError(problema, 'No se pudo cambiar el estado del cliente.'))
    }
  }, [detalle, actualizarResumen])

  if (cargando || (detalle && detalle.id !== id)) {
    return (
      <div className="page-container org-detalle-page adm-page">
        <EsqueletoFicha />
      </div>
    )
  }

  if (error || !detalle) {
    return (
      <div className="page-container org-detalle-page adm-page">
        <CabeceraAdmin eyebrow="Clientes" titulo="Ficha de cliente" subtitulo="No fue posible abrir esta ficha." />
        <div className="adm-alerta" role="alert">{error || 'No se encontró el cliente.'}</div>
        <button type="button" className="adm-btn adm-btn--secundario" onClick={() => navigate('/organizaciones')}>
          Volver a clientes
        </button>
      </div>
    )
  }

  const granjaSeleccionada = detalle.granjas.some((item) => item.id === granjaActivaId)
    ? granjaActivaId
    : (detalle.granjas[0]?.id ?? null)

  const prospectos = detalle.usuarios.flatMap((usuario) =>
    usuario.prospectos_convertidos.map((prospecto) => ({ usuario, prospecto })),
  )
  const solicitudes = prospectos.flatMap(({ usuario, prospecto }) =>
    prospecto.solicitudes.map((solicitud) => ({ usuario, prospecto, solicitud })),
  )
  const solicitudesAbiertas = solicitudes.filter(({ solicitud }) => solicitud.estado === 'abierta' || solicitud.estado === 'en_proceso').length

  return (
    <div className="page-container org-detalle-page adm-page">
      <nav className="org-detalle-miga" aria-label="Navegación">
        <Link to="/organizaciones" className="org-detalle-volver">
          <IcArrowRight size={15} className="org-detalle-volver-icono" aria-hidden="true" />
          <span>Volver a clientes</span>
        </Link>
      </nav>

      {avisoActualizacion && <p className="adm-aviso" role="status">{avisoActualizacion}</p>}

      <div className="org-expediente">
        <HeroOrganizacion
          detalle={detalle}
          granjaActivaId={granjaSeleccionada}
          alElegirGranja={elegirGranja}
          alEditar={puedeGestionar ? () => setEditando(true) : undefined}
          alAlternarEstado={puedeGestionar ? () => void alternarEstado() : undefined}
          alEliminar={puedeGestionar ? () => setEliminando(true) : undefined}
        />

        <div className="org-espacio">
          <div className="org-tabs" role="tablist" aria-label="Secciones del cliente">
            <button
              type="button"
              role="tab"
              id="tab-granjas"
              aria-selected={pestana === 'granjas'}
              aria-controls="panel-granjas"
              className={`org-tab${pestana === 'granjas' ? ' is-activa' : ''}`}
              onClick={() => setPestana('granjas')}
            >
              <IcLeaf size={16} aria-hidden="true" />
              <span>Granjas y galpones</span>
              <span className="org-tab-conteo">{detalle.granjas.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              id="tab-personas"
              aria-selected={pestana === 'personas'}
              aria-controls="panel-personas"
              className={`org-tab${pestana === 'personas' ? ' is-activa' : ''}`}
              onClick={() => setPestana('personas')}
            >
              <IcUsers size={16} aria-hidden="true" />
              <span>Personas y acceso</span>
              <span className="org-tab-conteo">{detalle.usuarios.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              id="tab-soporte"
              aria-selected={pestana === 'soporte'}
              aria-controls="panel-soporte"
              className={`org-tab${pestana === 'soporte' ? ' is-activa' : ''}`}
              onClick={() => setPestana('soporte')}
            >
              <IcChat size={16} aria-hidden="true" />
              <span>Soporte PQRS</span>
              <span className={`org-tab-conteo${solicitudesAbiertas > 0 ? ' is-alerta' : ''}`}>{solicitudes.length}</span>
            </button>
          </div>

          {pestana === 'granjas' && (
            <section id="panel-granjas" role="tabpanel" aria-labelledby="tab-granjas" className="org-panel-vista">
              <EstructuraOrganizacion
                detalle={detalle}
                granjaActivaId={granjaSeleccionada}
                onSeleccionarGranja={setGranjaActivaId}
                recargarDetalle={actualizarResumen}
              />
            </section>
          )}

          {pestana === 'personas' && (
            <section id="panel-personas" role="tabpanel" aria-labelledby="tab-personas" className="org-panel-vista">
              <div className="org-panel-barra">
                <div>
                  <h2>Personas con acceso</h2>
                  <p>Propietarios y operarios vinculados a {detalle.nombre}.</p>
                </div>
                <Link to="/usuarios" className="est-boton est-boton--secundario">
                  Gestionar usuarios <IcArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>

              {detalle.usuarios.length === 0 ? (
                <div className="org-soporte-vacio">
                  <IcUsers size={24} aria-hidden="true" />
                  <strong>Sin personas todavía</strong>
                  <span>Cuando se cree el propietario u otros operarios de este cliente, aparecerán aquí.</span>
                  <Link to="/usuarios" className="est-boton est-boton--principal" style={{ marginTop: '0.5rem', textDecoration: 'none' }}>
                    Crear usuario <IcArrowRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              ) : (
                <ul className="org-personas-lista" aria-label="Personas del cliente">
                  {detalle.usuarios.map((usuario) => {
                    const seguridad = usuario.seguridad_cuenta
                    const ultima = usuario.recuperaciones_solicitadas[0]
                    const acceso = !usuario.activo
                      ? { tono: 'inactiva', texto: 'Inactiva' }
                      : seguridad?.bloqueado_hasta && new Date(seguridad.bloqueado_hasta) > new Date()
                        ? { tono: 'bloqueada', texto: 'Bloqueada' }
                        : seguridad?.debe_cambiar_password
                          ? { tono: 'cambio', texto: 'Debe cambiar clave' }
                          : { tono: 'normal', texto: 'Acceso normal' }
                    return (
                      <li className="org-persona-card" key={usuario.id}>
                        <div className="org-personas-persona">
                          <span className={`org-personas-avatar org-personas-avatar--${usuario.rol.nombre.toLowerCase()}`} aria-hidden="true">
                            {usuario.nombre_completo.trim().split(/\s+/).slice(0, 2).map((parte) => parte[0]?.toUpperCase()).join('')}
                          </span>
                          <span className="org-personas-texto">
                            <strong>{usuario.nombre_completo}</strong>
                            <small>{usuario.rol.nombre}</small>
                          </span>
                        </div>

                        <div className="org-persona-contacto">
                          {usuario.email ? <a href={`mailto:${usuario.email}`}>{usuario.email}</a> : <span>Sin correo</span>}
                          <small>{usuario.telefono || 'Sin teléfono'}</small>
                        </div>

                        <div className="org-persona-estado">
                          <span className={`org-personas-acceso org-personas-acceso--${acceso.tono}`}>{acceso.texto}</span>
                          <small>
                            {seguridad?.fecha_ultimo_login ? `Ingresó ${fechaCorta(seguridad.fecha_ultimo_login)}` : 'Nunca ha ingresado'}
                            {ultima ? ` · Recuperación: ${etiquetaEstado(ultima.estado)}` : ''}
                          </small>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}

              <p className="org-detalle-nota-global">
                Nunca se muestran contraseñas ni tokens. Las solicitudes de acceso se resuelven en <Link to="/recuperaciones-password">Recuperar acceso</Link>.
              </p>
            </section>
          )}

          {pestana === 'soporte' && (
            <section id="panel-soporte" role="tabpanel" aria-labelledby="tab-soporte" className="org-panel-vista">
              {solicitudes.length === 0 ? (
                <div className="org-soporte-vacio">
                  <IcChat size={24} aria-hidden="true" />
                  <strong>Sin solicitudes de soporte</strong>
                  <span>Aquí aparecen las PQRS que radicaron las personas de este cliente.</span>
                </div>
              ) : (
                <>
                  <ul className="org-soporte-resumen" aria-label="Resumen de soporte">
                    {RESUMEN_SOPORTE.map(({ etiqueta, estados }) => (
                      <li key={etiqueta}>
                        <span>{etiqueta}</span>
                        <strong>{solicitudes.filter(({ solicitud }) => estados.includes(solicitud.estado)).length}</strong>
                      </li>
                    ))}
                  </ul>
                  <ul className="org-soporte-lista">
                    {solicitudes.map(({ usuario, solicitud }) => (
                      <li key={solicitud.id}>
                        <Link className="org-soporte-fila" to={`/solicitudes-pqrs?solicitud=${solicitud.id}`}>
                          <span className="org-soporte-info">
                            <span className="org-soporte-linea">
                              <span className="org-soporte-radicado">PQRS-{String(solicitud.id).padStart(6, '0')}</span>
                              <span className="org-soporte-categoria">{solicitud.categoria}</span>
                            </span>
                            <strong>{solicitud.asunto || 'Sin asunto'}</strong>
                            <small>{usuario.nombre_completo}</small>
                          </span>
                          <span className={`org-soporte-estado org-soporte-estado--${solicitud.estado}`}>{etiquetaEstado(solicitud.estado)}</span>
                          <time className="org-soporte-fecha">{fechaCorta(solicitud.fecha_creacion)}</time>
                          <IcChevronRight size={16} aria-hidden="true" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {detalle.usuarios.some((usuario) => usuario._count.prospectos_convertidos > usuario.prospectos_convertidos.length) && (
                <p className="org-detalle-nota-global">Se muestran las cinco conversiones más recientes por persona; el resto está en <Link to="/solicitudes-pqrs">Solicitudes PQRS</Link>.</p>
              )}
            </section>
          )}
        </div>
      </div>

      {editando && (
        <FormularioOrganizacion
          editando={detalle}
          planesConocidos={[detalle.plan].filter(Boolean)}
          onGuardar={guardarEdicion}
          onCerrar={() => setEditando(false)}
        />
      )}

      {eliminando && (
        <EliminarOrganizacion
          organizacionId={detalle.id}
          nombre={detalle.nombre}
          onCerrar={() => setEliminando(false)}
          onEliminada={() => navigate('/organizaciones', { replace: true })}
        />
      )}
    </div>
  )
}

export default OrganizacionDetallePage
