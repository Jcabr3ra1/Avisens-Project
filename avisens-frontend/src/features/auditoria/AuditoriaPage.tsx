import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import Modal from '@shared/ui/Modal/Modal'
import { IcCheck, IcChevronDown, IcChevronRight, IcClose, IcDoc } from '@shared/ui/icons/icons'
import {
  contarFiltrosActivos,
  extraerCambios,
  hayFiltros,
  periodoActivo,
  rangoDePeriodo,
  rangoValido,
  resumirNavegador,
  type PeriodoRapido,
  type RegistroAuditoria,
} from './model/auditoria'
import { useAuditoria } from './hooks/useAuditoria'
import EstadoVacio from '@shared/ui/Estados/EstadoVacio'
import Cargando from '@shared/ui/Estados/Cargando'
import '@shared/ui/admin/AdminKit.css'
import './AuditoriaPage.css'

const ACCIONES_CON_ESTILO = [
  'crear', 'create', 'registro',
  'actualizar', 'update', 'edicion',
  'eliminar', 'delete', 'anular',
  'login', 'logout', 'sesion',
  'consultar', 'leer', 'read',
]

function claseDeAccion(accion: string): string {
  const normalizada = accion.trim().toLowerCase()
  return ACCIONES_CON_ESTILO.includes(normalizada) ? normalizada : 'otra'
}

const ETIQUETAS_ACCION: Record<string, string> = {
  crear: 'Creación', create: 'Creación', registro: 'Registro',
  actualizar: 'Edición', update: 'Edición', edicion: 'Edición',
  eliminar: 'Eliminación', delete: 'Eliminación', anular: 'Anulación',
  login: 'Ingreso', logout: 'Salida', sesion: 'Sesión',
  consultar: 'Consulta', leer: 'Consulta', read: 'Consulta',
}

const ENTIDADES_ETIQUETA: Record<string, string> = {
  usuario: 'Usuario',
  usuarios: 'Usuarios',
  granja: 'Granja',
  granjas: 'Granjas',
  galpon: 'Galpón',
  galpones: 'Galpones',
  lote: 'Lote',
  lotes: 'Lotes',
  sensor: 'Sensor',
  sensores: 'Sensores',
  auth: 'Sesión',
  organizaciones: 'Organizaciones',
  prospectos: 'Prospectos',
}

const PERIODOS: Array<{ id: PeriodoRapido; etiqueta: string }> = [
  { id: 'todo', etiqueta: 'Todo' },
  { id: 'hoy', etiqueta: 'Hoy' },
  { id: '7d', etiqueta: 'Últimos 7 días' },
  { id: '30d', etiqueta: 'Últimos 30 días' },
]

function etiquetaAccion(accion: string): string {
  const normalizada = accion.trim().toLowerCase()
  return ETIQUETAS_ACCION[normalizada] ?? normalizada.charAt(0).toUpperCase() + normalizada.slice(1)
}

function etiquetaEntidad(entidad: string): string {
  const texto = ENTIDADES_ETIQUETA[entidad] ?? entidad.replace(/[_-]/g, ' ')
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function etiquetaCampo(campo: string): string {
  const limpio = campo.replace(/[_-]/g, ' ')
  return limpio.charAt(0).toUpperCase() + limpio.slice(1)
}

function hace(fecha: string): string {
  const minutos = Math.floor((Date.now() - new Date(fecha).getTime()) / 60_000)
  if (minutos < 1) return 'Ahora'
  if (minutos < 60) return `Hace ${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `Hace ${horas} h`
  return `Hace ${Math.floor(horas / 24)} d`
}

function formatearFecha(fecha: string) {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(fecha))
}

const FECHA_CORTA = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
const HORA_CORTA = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' })

function limpiarIp(ip: string | null): string {
  return ip?.replace(/^::ffff:/, '') ?? '—'
}

function aJsonBonito(valor: unknown): string {
  return JSON.stringify(valor, null, 2)
}

function PanelDetalleAuditoria({
  registro,
  onCerrar,
}: {
  registro: RegistroAuditoria
  onCerrar: () => void
}) {
  const [vista, setVista] = useState<'resumen' | 'json'>('resumen')
  const [copiado, setCopiado] = useState(false)

  const tienePayload = registro.datos_antes != null || registro.datos_despues != null
  const cambios = useMemo(
    () => extraerCambios(registro.datos_antes, registro.datos_despues),
    [registro.datos_antes, registro.datos_despues],
  )
  const esComparativa = registro.datos_antes != null && registro.datos_despues != null

  async function copiarJson() {
    const contenido = aJsonBonito({
      evento_id: registro.id,
      accion: registro.accion,
      entidad: registro.entidad_afectada,
      registro_id: registro.registro_id,
      fecha_hora: registro.fecha_hora,
      usuario: registro.usuario,
      ip_origen: limpiarIp(registro.ip_origen),
      datos_antes: registro.datos_antes,
      datos_despues: registro.datos_despues,
    })
    try {
      await navigator.clipboard.writeText(contenido)
      setCopiado(true)
      toast.success('Detalle JSON copiado')
      window.setTimeout(() => setCopiado(false), 2000)
    } catch {
      toast.error('No se pudo copiar al portapapeles.')
    }
  }

  return (
    <Modal
      variante="lateral"
      ancho="ancho"
      titulo={`${etiquetaAccion(registro.accion)} · ${etiquetaEntidad(registro.entidad_afectada)}`}
      subtitulo={`Evento #${registro.id}${registro.registro_id !== null ? ` · Registro #${registro.registro_id}` : ''}`}
      onCerrar={onCerrar}
    >
      <div className="aud-panel-contenido">
        <div className="aud-panel-estado">
          <span className={`aud-accion aud-accion--${claseDeAccion(registro.accion)}`}>
            <span className="aud-accion-punto" aria-hidden="true" />
            {etiquetaAccion(registro.accion)}
          </span>
          <span className="aud-panel-cuando">{hace(registro.fecha_hora)}</span>
        </div>

        <dl className="aud-datos">
          <div>
            <dt>Usuario</dt>
            <dd>
              <strong>{registro.usuario?.nombre_completo ?? 'Sistema o acción anónima'}</strong>
              {registro.usuario?.email && <span className="aud-datos-sub">{registro.usuario.email}</span>}
            </dd>
          </div>
          <div>
            <dt>Fecha y hora</dt>
            <dd>{formatearFecha(registro.fecha_hora)}</dd>
          </div>
          <div>
            <dt>Dirección IP</dt>
            <dd className="aud-mono">{limpiarIp(registro.ip_origen)}</dd>
          </div>
          <div>
            <dt>Navegador</dt>
            <dd title={registro.user_agent ?? undefined}>{resumirNavegador(registro.user_agent)}</dd>
          </div>
        </dl>

        {tienePayload ? (
          <section className="aud-payload">
            <div className="aud-payload-barra">
              <div className="aud-payload-tabs" role="tablist" aria-label="Vista del cambio">
                <button
                  type="button"
                  role="tab"
                  aria-selected={vista === 'resumen'}
                  className={`aud-payload-tab${vista === 'resumen' ? ' is-activa' : ''}`}
                  onClick={() => setVista('resumen')}
                >
                  {esComparativa ? `Cambios (${cambios.length})` : `Datos (${cambios.length})`}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={vista === 'json'}
                  className={`aud-payload-tab${vista === 'json' ? ' is-activa' : ''}`}
                  onClick={() => setVista('json')}
                >
                  JSON técnico
                </button>
              </div>

              <button type="button" className="aud-copiar" onClick={() => void copiarJson()}>
                {copiado ? <IcCheck size={14} aria-hidden="true" /> : <IcDoc size={14} aria-hidden="true" />}
                {copiado ? 'Copiado' : 'Copiar JSON'}
              </button>
            </div>

            {vista === 'resumen' ? (
              cambios.length > 0 ? (
                <ul className="aud-cambios">
                  {cambios.map((cambio) => (
                    <li key={cambio.campo} className={`aud-cambio aud-cambio--${cambio.tipo}`}>
                      <span className="aud-cambio-campo">{etiquetaCampo(cambio.campo)}</span>
                      <div className="aud-cambio-valores">
                        {cambio.antes !== null && (
                          <span className="aud-cambio-antes" title={cambio.antes}>{cambio.antes}</span>
                        )}
                        {cambio.antes !== null && cambio.despues !== null && (
                          <span className="aud-cambio-flecha" aria-hidden="true">→</span>
                        )}
                        {cambio.despues !== null && (
                          <span className="aud-cambio-despues" title={cambio.despues}>{cambio.despues}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="aud-sin-json">
                  {esComparativa
                    ? 'No hubo diferencias en los campos comparados.'
                    : 'Consulta la pestaña «JSON técnico» para ver el detalle completo.'}
                </p>
              )
            ) : (
              <div className="aud-json-grupo">
                {registro.datos_antes != null && (
                  <section className="aud-json-seccion">
                    <h3>Estado anterior</h3>
                    <pre>{aJsonBonito(registro.datos_antes)}</pre>
                  </section>
                )}
                {registro.datos_despues != null && (
                  <section className="aud-json-seccion">
                    <h3>Estado resultante</h3>
                    <pre>{aJsonBonito(registro.datos_despues)}</pre>
                  </section>
                )}
              </div>
            )}
          </section>
        ) : (
          <p className="aud-sin-json">Este registro no guarda datos del cambio.</p>
        )}
      </div>
    </Modal>
  )
}

function AuditoriaPage() {
  const {
    registros,
    pagina,
    porPagina,
    total,
    totalPaginas,
    ultimaActividad,
    cargando,
    error,
    filtros,
    opciones,
    cambiarPagina,
    cambiarFiltros,
    limpiarFiltros,
    recargar,
  } = useAuditoria()

  const filtrando = hayFiltros(filtros)
  const filtrosActivos = contarFiltrosActivos(filtros)
  const rangoMal = !rangoValido(filtros)
  const periodo = periodoActivo(filtros)
  const [detalle, setDetalle] = useState<RegistroAuditoria | null>(null)

  const desdeIndice = total === 0 ? 0 : (pagina - 1) * porPagina + 1
  const hastaIndice = Math.min(pagina * porPagina, total)

  return (
    <div className="page-container aud-page adm-page">
      <header className="aud-cabecera">
        <div>
          <span className="adm-eyebrow">
            <span className="adm-eyebrow-punto" aria-hidden="true" />
            Plataforma · Trazabilidad
          </span>
          <h1 className="aud-titulo">Auditoría</h1>
          <p className="aud-subtitulo">Quién hizo cada cambio, sobre qué y cuándo.</p>
        </div>
      </header>

      <ul className="aud-indicadores" aria-label="Resumen de auditoría">
        <li>
          <span>{filtrando ? 'Eventos filtrados' : 'Eventos registrados'}</span>
          <strong>{cargando && total === 0 ? '—' : total.toLocaleString('es-CO')}</strong>
          <small>{filtrando ? `${filtrosActivos} ${filtrosActivos === 1 ? 'filtro activo' : 'filtros activos'}` : 'Historial completo'}</small>
        </li>
        <li>
          <span>Última actividad</span>
          <strong>{ultimaActividad ? hace(ultimaActividad) : '—'}</strong>
          <small>{ultimaActividad ? formatearFecha(ultimaActividad) : 'Sin registros todavía'}</small>
        </li>
        <li>
          <span>Usuarios con actividad</span>
          <strong>{opciones.usuarios.length}</strong>
          <small>{opciones.usuarios.length === 1 ? 'Persona registrada' : 'Personas registradas'}</small>
        </li>
        <li>
          <span>Módulos auditados</span>
          <strong>{opciones.entidades.length}</strong>
          <small>{opciones.acciones.length} {opciones.acciones.length === 1 ? 'tipo de acción' : 'tipos de acción'}</small>
        </li>
      </ul>

      <section className="aud-filtros-bloque" role="search" aria-label="Filtrar la bitácora">
        <div className="aud-filtros-top">
          <div className="aud-periodos" role="group" aria-label="Periodo rápido">
            {PERIODOS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={periodo === item.id}
                className={`aud-periodo${periodo === item.id ? ' is-activo' : ''}`}
                onClick={() => cambiarFiltros(rangoDePeriodo(item.id))}
              >
                {item.etiqueta}
              </button>
            ))}
          </div>

          {filtrando && (
            <button type="button" className="aud-limpiar" onClick={limpiarFiltros}>
              <IcClose size={14} aria-hidden="true" />
              Limpiar ({filtrosActivos})
            </button>
          )}
        </div>

        <div className="aud-filtros">
          <label className="aud-filtro">
            <span>Acción</span>
            <span className="aud-selector">
              <select
                value={filtros.accion ?? ''}
                onChange={(evento) => cambiarFiltros({ accion: evento.target.value || undefined })}
              >
                <option value="">Todas</option>
                {opciones.acciones.map((accion) => (
                  <option key={accion} value={accion}>{etiquetaAccion(accion)}</option>
                ))}
              </select>
              <IcChevronDown size={15} aria-hidden="true" />
            </span>
          </label>

          <label className="aud-filtro">
            <span>Entidad</span>
            <span className="aud-selector">
              <select
                value={filtros.entidad ?? ''}
                onChange={(evento) => cambiarFiltros({ entidad: evento.target.value || undefined })}
              >
                <option value="">Todas</option>
                {opciones.entidades.map((entidad) => (
                  <option key={entidad} value={entidad}>{etiquetaEntidad(entidad)}</option>
                ))}
              </select>
              <IcChevronDown size={15} aria-hidden="true" />
            </span>
          </label>

          <label className="aud-filtro">
            <span>Usuario</span>
            <span className="aud-selector">
              <select
                value={filtros.usuario_id ?? ''}
                onChange={(evento) => cambiarFiltros({ usuario_id: evento.target.value ? Number(evento.target.value) : undefined })}
              >
                <option value="">Todos</option>
                {opciones.usuarios.map((usuario) => (
                  <option key={usuario.id} value={usuario.id}>{usuario.nombre_completo}</option>
                ))}
              </select>
              <IcChevronDown size={15} aria-hidden="true" />
            </span>
          </label>

          <label className="aud-filtro">
            <span>Desde</span>
            <input
              type="date"
              value={filtros.desde ?? ''}
              max={filtros.hasta}
              onChange={(evento) => cambiarFiltros({ desde: evento.target.value || undefined })}
              aria-invalid={rangoMal || undefined}
            />
          </label>

          <label className="aud-filtro">
            <span>Hasta</span>
            <input
              type="date"
              value={filtros.hasta ?? ''}
              min={filtros.desde}
              onChange={(evento) => cambiarFiltros({ hasta: evento.target.value || undefined })}
              aria-invalid={rangoMal || undefined}
            />
          </label>
        </div>

        {rangoMal && (
          <p className="aud-filtros-aviso" role="alert">
            La fecha «Desde» debe ser anterior o igual a «Hasta».
          </p>
        )}
      </section>

      {error && (
        <div className="adm-alerta" role="alert">
          <span>{error}</span>
          <button type="button" onClick={recargar}>Reintentar</button>
        </div>
      )}

      {cargando && registros.length === 0 ? (
        <Cargando texto="Cargando bitácora…" />
      ) : registros.length === 0 ? (
        <EstadoVacio
          className="aud-vacio"
          titulo={filtrando ? 'Sin coincidencias' : 'Sin registros'}
          texto={filtrando
            ? 'Ningún evento coincide con los filtros. Prueba con otro rango o acción.'
            : 'Cuando se realicen acciones en el sistema aparecerán aquí.'}
          accion={filtrando
            ? <button type="button" className="adm-btn adm-btn--secundario" onClick={limpiarFiltros}>Limpiar filtros</button>
            : undefined}
        />
      ) : (
        <section className="aud-listado" aria-busy={cargando}>
          <div className="aud-tabla-contenedor">
            <table className="aud-tabla">
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Usuario</th>
                  <th scope="col">Acción</th>
                  <th scope="col">Entidad</th>
                  <th scope="col">IP</th>
                  <th scope="col"><span className="sr-only">Detalle</span></th>
                </tr>
              </thead>
              <tbody>
                {registros.map((registro) => {
                  const seleccionada = detalle?.id === registro.id
                  const fecha = new Date(registro.fecha_hora)
                  return (
                    <tr
                      key={registro.id}
                      className={`aud-fila${seleccionada ? ' is-seleccionada' : ''}`}
                      tabIndex={0}
                      onClick={() => setDetalle(registro)}
                      onKeyDown={(evento) => {
                        if (evento.key === 'Enter' || evento.key === ' ') {
                          evento.preventDefault()
                          setDetalle(registro)
                        }
                      }}
                    >
                      <td>
                        <span className="aud-celda-texto">
                          <strong>{FECHA_CORTA.format(fecha)}</strong>
                          <span>{HORA_CORTA.format(fecha)}</span>
                        </span>
                      </td>
                      <td>
                        <span className="aud-celda-texto">
                          <strong>{registro.usuario?.nombre_completo ?? 'Sistema'}</strong>
                          <span>{registro.usuario?.email ?? 'Sin correo'}</span>
                        </span>
                      </td>
                      <td>
                        <span className={`aud-accion aud-accion--${claseDeAccion(registro.accion)}`}>
                          <span className="aud-accion-punto" aria-hidden="true" />
                          {etiquetaAccion(registro.accion)}
                        </span>
                      </td>
                      <td>
                        <span className="aud-celda-texto">
                          <strong>{etiquetaEntidad(registro.entidad_afectada)}</strong>
                          <span>{registro.registro_id !== null ? `Registro #${registro.registro_id}` : 'Sin registro'}</span>
                        </span>
                      </td>
                      <td className="aud-ip">{limpiarIp(registro.ip_origen)}</td>
                      <td className="aud-col-accion">
                        <span className="aud-ver" aria-hidden="true">
                          Ver <IcChevronRight size={14} />
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <footer className="aud-paginado">
            <span>
              Mostrando {desdeIndice}–{hastaIndice} de {total.toLocaleString('es-CO')} eventos · Página {pagina} de {totalPaginas}
            </span>
            <div>
              <button type="button" onClick={() => cambiarPagina(pagina - 1)} disabled={pagina <= 1 || cargando}>
                Anterior
              </button>
              <button type="button" onClick={() => cambiarPagina(pagina + 1)} disabled={pagina >= totalPaginas || cargando}>
                Siguiente
              </button>
            </div>
          </footer>
        </section>
      )}

      {detalle && (
        <PanelDetalleAuditoria
          key={detalle.id}
          registro={detalle}
          onCerrar={() => setDetalle(null)}
        />
      )}
    </div>
  )
}

export default AuditoriaPage
