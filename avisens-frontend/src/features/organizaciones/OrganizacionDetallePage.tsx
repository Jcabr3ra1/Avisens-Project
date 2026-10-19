import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import CabeceraAdmin from '@shared/ui/admin/CabeceraAdmin'
import { IcAlert, IcChat, IcChevronRight, IcLeaf, IcUsers } from '@shared/ui/icons/icons'
import { mensajeDeError } from '@shared/utils/errores'
import {
  obtenerDetalleOrganizacion,
  type OrganizacionDetalle,
} from './api/organizaciones'
import Desplegable from './components/Desplegable'
import HeroOrganizacion from './components/HeroOrganizacion'
import EstructuraOrganizacion from './components/EstructuraOrganizacion'
import '@shared/ui/admin/AdminKit.css'
import './OrganizacionDetallePage.css'

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
    <div className="org-esqueleto" role="status">
      <span className="sr-only">Cargando la organización…</span>
      <div className="org-esqueleto-hero" aria-hidden="true">
        <div className="org-esqueleto-texto">
          <span className="org-brilla" />
          <span className="org-brilla" />
          <span className="org-brilla" />
          <span className="org-brilla" />
        </div>
        <div className="org-esqueleto-escena org-brilla" />
      </div>
      <div className="org-esqueleto-bloque org-brilla" aria-hidden="true" />
      <div className="org-esqueleto-bloque org-brilla" aria-hidden="true" />
    </div>
  )
}

function OrganizacionDetallePage() {
  const { id: idTexto } = useParams()
  const navigate = useNavigate()
  const id = Number(idTexto)
  const seccionGranjasRef = useRef<HTMLDetailsElement>(null)
  const [resaltadaId, setResaltadaId] = useState<number | null>(null)
  const [revelada, setRevelada] = useState<{ id: number; vez: number } | null>(null)
  const [detalle, setDetalle] = useState<OrganizacionDetalle | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [avisoActualizacion, setAvisoActualizacion] = useState('')
  const secuenciaCarga = useRef(0)

  // Actualiza los conteos sin desmontar el formulario que conserva el token
  // recién generado. Ese secreto solo se muestra durante el registro actual.
  const actualizarResumen = useCallback(async () => {
    const version = secuenciaCarga.current
    try {
      const actualizado = await obtenerDetalleOrganizacion(id)
      if (version !== secuenciaCarga.current) return
      setDetalle(actualizado)
      setAvisoActualizacion('')
    } catch {
      if (version !== secuenciaCarga.current) return
      setAvisoActualizacion('El cambio se guardó, pero no se pudo actualizar el resumen. Usa Actualizar para volver a consultarlo.')
    }
  }, [id])

  const cargar = useCallback(async () => {
    const version = ++secuenciaCarga.current
    setDetalle(null)
    setAvisoActualizacion('')
    if (!Number.isInteger(id) || id <= 0) {
      setError('El identificador de la organización no es válido.')
      setCargando(false)
      return
    }
    setCargando(true)
    setError('')
    try {
      const actualizado = await obtenerDetalleOrganizacion(id)
      if (version === secuenciaCarga.current) setDetalle(actualizado)
    } catch (problema) {
      if (version === secuenciaCarga.current) setError(mensajeDeError(problema, 'No se pudo cargar la organización.'))
    } finally {
      if (version === secuenciaCarga.current) setCargando(false)
    }
  }, [id])

  useEffect(() => {
    void cargar()
    return () => { secuenciaCarga.current += 1 }
  }, [cargar])

  const revelarGranja = useCallback((granjaId: number) => {
    if (seccionGranjasRef.current) seccionGranjasRef.current.open = true
    setRevelada(anterior => ({ id: granjaId, vez: (anterior?.vez ?? 0) + 1 }))
    const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    requestAnimationFrame(() => {
      document.getElementById(`org-granja-${granjaId}`)?.scrollIntoView({ behavior: reducir ? 'auto' : 'smooth', block: 'center' })
    })
  }, [])

  useEffect(() => {
    if (!revelada) return
    const temporizador = window.setTimeout(() => setRevelada(null), 1900)
    return () => window.clearTimeout(temporizador)
  }, [revelada])

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
        <CabeceraAdmin eyebrow="Organizaciones" titulo="Ficha de organización" subtitulo="No fue posible abrir esta ficha." />
        <div className="adm-alerta" role="alert">{error || 'No se encontró la organización.'}</div>
        <button type="button" className="adm-btn adm-btn--secundario" onClick={() => navigate('/organizaciones')}>
          Volver a organizaciones
        </button>
      </div>
    )
  }

  const prospectos = detalle.usuarios.flatMap((usuario) =>
    usuario.prospectos_convertidos.map((prospecto) => ({ usuario, prospecto })),
  )
  const solicitudes = prospectos.flatMap(({ usuario, prospecto }) =>
    prospecto.solicitudes.map((solicitud) => ({ usuario, prospecto, solicitud })),
  )

  return (
    <div className="page-container org-detalle-page adm-page">
      <HeroOrganizacion
        detalle={detalle}
        resaltadaId={resaltadaId}
        alElegirGranja={revelarGranja}
        alActualizar={() => void cargar()}
        alVolver={() => navigate('/organizaciones')}
      />

      {avisoActualizacion && <p className="adm-aviso" role="status">{avisoActualizacion}</p>}

      <Desplegable
        ref={seccionGranjasRef}
        titulo="Granjas y estructura"
        icono={<IcLeaf size={18} />}
        conteo={detalle.granjas.length}
        orden={4}
      >
        <EstructuraOrganizacion
          detalle={detalle}
          recargarDetalle={actualizarResumen}
          resaltadaId={resaltadaId}
          reveladaId={revelada?.id ?? null}
          reveladaVez={revelada?.vez ?? 0}
          onResaltar={setResaltadaId}
        />
      </Desplegable>

      <Desplegable
        titulo="Personas y acceso"
        icono={<IcUsers size={18} />}
        conteo={detalle.usuarios.length}
        orden={6}
      >
        {detalle.usuarios.length === 0 ? (
          <div className="org-soporte-vacio">
            <IcUsers size={22} aria-hidden="true" />
            <strong>Sin personas todavía</strong>
            <span>Cuando se cree el propietario u otros operarios de esta organización, aparecerán aquí.</span>
          </div>
        ) : (
          <div className="org-personas-tabla" role="table" aria-label="Personas de la organización">
            <div className="org-personas-fila org-personas-fila--cabecera" role="row">
              <span role="columnheader">Persona</span>
              <span role="columnheader">Contacto</span>
              <span role="columnheader">Último ingreso</span>
              <span role="columnheader">Acceso</span>
              <span role="columnheader">Recuperación</span>
            </div>
            {detalle.usuarios.map((usuario) => {
              const seguridad = usuario.seguridad_cuenta
              const ultima = usuario.recuperaciones_solicitadas[0]
              const acceso = !usuario.activo
                ? { tono: 'inactiva', texto: 'Inactiva' }
                : seguridad?.bloqueado_hasta && new Date(seguridad.bloqueado_hasta) > new Date()
                  ? { tono: 'bloqueada', texto: 'Bloqueada' }
                  : seguridad?.debe_cambiar_password
                    ? { tono: 'cambio', texto: 'Debe cambiar clave' }
                    : { tono: 'normal', texto: 'Normal' }
              return (
                <div className="org-personas-fila" role="row" key={usuario.id}>
                  <span className="org-personas-persona" role="cell">
                    <span className={`org-personas-avatar org-personas-avatar--${usuario.rol.nombre.toLowerCase()}`} aria-hidden="true">
                      {usuario.nombre_completo.trim().split(/\s+/).slice(0, 2).map((parte) => parte[0]?.toUpperCase()).join('')}
                    </span>
                    <span className="org-personas-texto">
                      <strong>{usuario.nombre_completo}</strong>
                      <small>{usuario.rol.nombre}</small>
                    </span>
                  </span>
                  <span className="org-personas-texto org-personas-texto--centro" role="cell">
                    {usuario.email ? <a href={`mailto:${usuario.email}`}>{usuario.email}</a> : <span>Sin correo</span>}
                    <small>{usuario.telefono || 'Sin teléfono'}</small>
                  </span>
                  <span className="org-personas-fecha" role="cell">{seguridad?.fecha_ultimo_login ? fechaCorta(seguridad.fecha_ultimo_login) : 'Nunca'}</span>
                  <span role="cell"><span className={`org-personas-acceso org-personas-acceso--${acceso.tono}`}>{acceso.texto}</span></span>
                  <span className="org-personas-texto org-personas-texto--centro" role="cell">
                    {ultima ? (
                      <>
                        <span>{etiquetaEstado(ultima.estado)}</span>
                        <small>{fechaCorta(ultima.fecha_creacion)}</small>
                      </>
                    ) : <span className="org-personas-nada">Sin solicitudes</span>}
                  </span>
                </div>
              )
            })}
          </div>
        )}
        <p className="org-detalle-nota-global">Nunca se muestran contraseñas ni tokens. Las solicitudes de acceso se resuelven en <Link to="/recuperaciones-password">Recuperar acceso</Link>.</p>
      </Desplegable>

      <Desplegable
        titulo="Soporte relacionado"
        icono={<IcChat size={18} />}
        conteo={solicitudes.length}
        orden={7}
      >
        {solicitudes.length === 0 ? (
          <div className="org-soporte-vacio">
            <IcChat size={22} aria-hidden="true" />
            <strong>Sin solicitudes de soporte</strong>
            <span>Aquí aparecen las PQRS que radicaron las personas de esta organización por el chatbot.</span>
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
          <p className="org-detalle-nota-global">Se muestran las cinco conversiones más recientes por persona; el resto está en Solicitudes PQRS.</p>
        )}
      </Desplegable>

      <div className="org-detalle-pie org-aparece" style={{ '--orden': 8 } as CSSProperties}>
        <IcAlert size={16} aria-hidden="true" />
        <span>Los módulos globales conservan su alcance actual. Esta ficha reúne únicamente relaciones directas o verificables desde la organización.</span>
      </div>
    </div>
  )
}

export default OrganizacionDetallePage
