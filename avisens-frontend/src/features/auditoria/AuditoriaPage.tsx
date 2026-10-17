import { useState } from 'react'
import Modal from '@shared/ui/Modal/Modal'
import { IcChevronDown, IcChevronRight, IcRefresh } from '@shared/ui/icons/icons'
import { hayFiltros, rangoValido, type RegistroAuditoria } from './model/auditoria'
import { useAuditoria } from './hooks/useAuditoria'
import EstadoVacioAnimado from '@shared/ui/Animacion/EstadoVacioAnimado'
import CargandoAnimado from '@shared/ui/Animacion/CargandoAnimado'
import '@shared/ui/admin/AdminKit.css'
import './AuditoriaPage.css'

// Las acciones con estilo propio. Cualquier otra cae en 'otra', que existe en
// el CSS: antes se fabricaba la clase con el valor crudo, así que una acción
// nueva del backend —como 'consultar', que apareció al empezar a registrar las
// lecturas— salía sin formato, como texto suelto dentro de la tabla.
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
  proveedores: 'Proveedores',
  prospectos: 'Prospectos',
}

function etiquetaAccion(accion: string): string {
  const normalizada = accion.trim().toLowerCase()
  return ETIQUETAS_ACCION[normalizada] ?? normalizada.charAt(0).toUpperCase() + normalizada.slice(1)
}

function etiquetaEntidad(entidad: string): string {
  const texto = ENTIDADES_ETIQUETA[entidad] ?? entidad.replace(/[_-]/g, ' ')
  return texto.charAt(0).toUpperCase() + texto.slice(1)
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

function aJsonBonito(valor: unknown): string {
  return JSON.stringify(valor, null, 2)
}

function AuditoriaPage() {
  const {
    registros,
    pagina,
    total,
    totalPaginas,
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
  const rangoMal = !rangoValido(filtros)
  const [detalle, setDetalle] = useState<RegistroAuditoria | null>(null)

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
        <button className="aud-boton-cabecera" type="button" onClick={recargar} disabled={cargando}>
          <IcRefresh size={17} aria-hidden="true" />
          {cargando ? 'Actualizando…' : 'Actualizar'}
        </button>
      </header>

      <ul className="aud-indicadores" aria-label="Resumen de auditoría">
        <li><span>{filtrando ? 'Eventos encontrados' : 'Eventos registrados'}</span><strong>{cargando && total === 0 ? '—' : total.toLocaleString('es-CO')}</strong><small>{filtrando ? 'Con los filtros aplicados' : 'Desde que se activó la bitácora'}</small></li>
        <li><span>Última actividad</span><strong>{pagina === 1 && registros[0] ? hace(registros[0].fecha_hora) : '—'}</strong><small>{pagina === 1 && registros[0] ? formatearFecha(registros[0].fecha_hora) : 'Vuelve a la primera página'}</small></li>
        <li><span>Página</span><strong>{pagina} / {totalPaginas}</strong><small>{registros.length} eventos en esta página</small></li>
      </ul>

      <div className="aud-filtros" role="search" aria-label="Filtrar la bitácora">
        <label className="aud-filtro">
          <span>Acción</span>
          <span className="aud-selector">
            <select value={filtros.accion ?? ''} onChange={(evento) => cambiarFiltros({ accion: evento.target.value || undefined })}>
              <option value="">Todas</option>
              {opciones.acciones.map((accion) => <option key={accion} value={accion}>{etiquetaAccion(accion)}</option>)}
            </select>
            <IcChevronDown size={16} aria-hidden="true" />
          </span>
        </label>
        <label className="aud-filtro">
          <span>Entidad</span>
          <span className="aud-selector">
            <select value={filtros.entidad ?? ''} onChange={(evento) => cambiarFiltros({ entidad: evento.target.value || undefined })}>
              <option value="">Todas</option>
              {opciones.entidades.map((entidad) => <option key={entidad} value={entidad}>{etiquetaEntidad(entidad)}</option>)}
            </select>
            <IcChevronDown size={16} aria-hidden="true" />
          </span>
        </label>
        <label className="aud-filtro">
          <span>Usuario</span>
          <span className="aud-selector">
            <select value={filtros.usuario_id ?? ''} onChange={(evento) => cambiarFiltros({ usuario_id: evento.target.value ? Number(evento.target.value) : undefined })}>
              <option value="">Todos</option>
              {opciones.usuarios.map((usuario) => <option key={usuario.id} value={usuario.id}>{usuario.nombre_completo}</option>)}
            </select>
            <IcChevronDown size={16} aria-hidden="true" />
          </span>
        </label>
        <label className="aud-filtro">
          <span>Desde</span>
          <input type="date" value={filtros.desde ?? ''} max={filtros.hasta} onChange={(evento) => cambiarFiltros({ desde: evento.target.value || undefined })} aria-invalid={rangoMal || undefined} />
        </label>
        <label className="aud-filtro">
          <span>Hasta</span>
          <input type="date" value={filtros.hasta ?? ''} min={filtros.desde} onChange={(evento) => cambiarFiltros({ hasta: evento.target.value || undefined })} aria-invalid={rangoMal || undefined} />
        </label>
        {filtrando && <button type="button" className="aud-limpiar" onClick={limpiarFiltros}>Limpiar filtros</button>}
        {rangoMal && <p className="aud-filtros-aviso" role="alert">La fecha «Desde» debe ser anterior a «Hasta».</p>}
      </div>

      {error && (
        <div className="adm-alerta" role="alert">
          <span>{error}</span>
          <button type="button" onClick={recargar}>Reintentar</button>
        </div>
      )}

      {cargando && registros.length === 0 ? (
        <CargandoAnimado texto="Cargando bitácora…" />
      ) : registros.length === 0 ? (
        <EstadoVacioAnimado
          className="aud-vacio"
          animacion="caja-vacia"
          titulo={filtrando ? 'Sin coincidencias' : 'Sin registros'}
          texto={filtrando ? 'Ningún evento coincide con los filtros. Prueba con otro rango o acción.' : 'Cuando se realicen acciones en el sistema aparecerán aquí.'}
          accion={filtrando ? <button type="button" className="adm-btn adm-btn--secundario" onClick={limpiarFiltros}>Limpiar filtros</button> : undefined}
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
                {registros.map((registro) => (
                  <tr key={registro.id}>
                    <td>
                      <span className="aud-celda-texto">
                        <strong>{FECHA_CORTA.format(new Date(registro.fecha_hora))}</strong>
                        <span>{HORA_CORTA.format(new Date(registro.fecha_hora))}</span>
                      </span>
                    </td>
                    <td>
                      <span className="aud-celda-texto">
                        <strong>{registro.usuario?.nombre_completo ?? 'Sistema'}</strong>
                        <span>{registro.usuario?.email ?? 'Sin correo'}</span>
                      </span>
                    </td>
                    <td>
                      <span className={`aud-accion aud-accion--${claseDeAccion(registro.accion)}`}>{etiquetaAccion(registro.accion)}</span>
                    </td>
                    <td>
                      <span className="aud-celda-texto aud-celda-texto--centro">
                        <strong>{etiquetaEntidad(registro.entidad_afectada)}</strong>
                        <span>{registro.registro_id !== null ? `Registro #${registro.registro_id}` : 'Sin registro'}</span>
                      </span>
                    </td>
                    <td className="aud-ip">{registro.ip_origen?.replace(/^::ffff:/, '') ?? '—'}</td>
                    <td>
                      <button className="aud-boton-fila" type="button" onClick={() => setDetalle(registro)}>
                        Ver cambios <IcChevronRight size={14} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <footer className="aud-paginado">
            <span>Página {pagina} de {totalPaginas} · {total.toLocaleString('es-CO')} eventos</span>
            <div>
              <button type="button" onClick={() => cambiarPagina(pagina - 1)} disabled={pagina <= 1 || cargando}>Anterior</button>
              <button type="button" onClick={() => cambiarPagina(pagina + 1)} disabled={pagina >= totalPaginas || cargando}>Siguiente</button>
            </div>
          </footer>
        </section>
      )}

      {detalle && (
        <Modal
          titulo={`${etiquetaAccion(detalle.accion)} · ${etiquetaEntidad(detalle.entidad_afectada)}`}
          subtitulo={`Evento #${detalle.id}${detalle.registro_id !== null ? ` · registro #${detalle.registro_id}` : ''}`}
          onCerrar={() => setDetalle(null)}
          ancho="ancho"
        >
          <div className="aud-panel-contenido">
              <dl className="aud-datos">
                <div>
                  <dt>Usuario</dt>
                  <dd>
                    {detalle.usuario
                      ? `${detalle.usuario.nombre_completo}${detalle.usuario.email ? ` (${detalle.usuario.email})` : ''}`
                      : 'Sistema o acción anónima'}
                  </dd>
                </div>
                <div>
                  <dt>Fecha</dt>
                  <dd>{formatearFecha(detalle.fecha_hora)}</dd>
                </div>
                <div>
                  <dt>Navegador</dt>
                  <dd>{detalle.user_agent ?? '—'}</dd>
                </div>
              </dl>

              {detalle.datos_antes != null && (
                <section className="aud-json-seccion">
                  <h3>Estado anterior</h3>
                  <pre>{aJsonBonito(detalle.datos_antes)}</pre>
                </section>
              )}
              {detalle.datos_despues != null && (
                <section className="aud-json-seccion">
                  <h3>Estado resultante</h3>
                  <pre>{aJsonBonito(detalle.datos_despues)}</pre>
                </section>
              )}
              {detalle.datos_antes == null && detalle.datos_despues == null && (
                <p className="aud-sin-json">
                  Este registro no guarda datos del cambio.
                </p>
              )}
          </div>
        </Modal>
      )}
    </div>
  )
}

export default AuditoriaPage
