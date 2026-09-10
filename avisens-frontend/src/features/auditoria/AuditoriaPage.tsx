import { useState } from 'react'
import CabeceraAdmin from '@shared/ui/admin/CabeceraAdmin'
import Modal from '@shared/ui/Modal/Modal'
import { IcRefresh } from '@shared/ui/icons/icons'
import type { RegistroAuditoria } from './model/auditoria'
import { useAuditoria } from './hooks/useAuditoria'
import '@shared/ui/admin/AdminKit.css'
import './AuditoriaPage.css'

const ENTIDADES_ETIQUETA: Record<string, string> = {
  usuario: 'Usuario',
  granja: 'Granja',
  galpon: 'Galpón',
  lote: 'Lote',
  sensor: 'Sensor',
}

function formatearFecha(fecha: string) {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(fecha))
}

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
    cambiarPagina,
    recargar,
  } = useAuditoria()
  const [detalle, setDetalle] = useState<RegistroAuditoria | null>(null)

  return (
    <div className="page-container aud-page adm-page">
      <CabeceraAdmin
        eyebrow="Trazabilidad del sistema"
        titulo="Bitácora de auditoría"
        subtitulo={`Consulta quién realizó cada cambio y cuándo ocurrió. ${total} eventos registrados.`}
        acciones={(
          <button className="adm-btn adm-btn--secundario" type="button" onClick={recargar} disabled={cargando}>
            <IcRefresh size={16} aria-hidden="true" />
            {cargando ? 'Actualizando…' : 'Actualizar'}
          </button>
        )}
      />

      {error && (
        <p className="aud-aviso adm-alerta" role="alert">
          {error}{' '}
          <button type="button" onClick={recargar}>
            Reintentar
          </button>
        </p>
      )}

      {cargando ? (
        <p className="aud-cargando" role="status">
          Cargando bitácora…
        </p>
      ) : registros.length === 0 ? (
        <section className="aud-vacio adm-panel">
          <h2>Sin registros</h2>
          <p>Cuando se realicen acciones en el sistema aparecerán aquí.</p>
        </section>
      ) : (
        <section className="aud-listado adm-panel">
          <div className="aud-tabla-contenedor">
            <table>
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Usuario</th>
                  <th scope="col">Acción</th>
                  <th scope="col">Entidad</th>
                  <th scope="col">IP</th>
                  <th scope="col">
                    <span className="aud-sr-only">Detalle</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {registros.map((registro) => (
                  <tr key={registro.id}>
                    <td className="aud-fecha">{formatearFecha(registro.fecha_hora)}</td>
                    <td>
                      <strong>
                        {registro.usuario?.nombre_completo ?? 'Sistema'}
                      </strong>
                      <span>{registro.usuario?.email ?? '—'}</span>
                    </td>
                    <td>
                      <span className={`aud-accion aud-accion--${registro.accion}`}>
                        {registro.accion}
                      </span>
                    </td>
                    <td>
                      {ENTIDADES_ETIQUETA[registro.entidad_afectada] ??
                        registro.entidad_afectada}
                      {registro.registro_id !== null && (
                        <span className="aud-registro-id">
                          {' '}
                          #{registro.registro_id}
                        </span>
                      )}
                    </td>
                    <td className="aud-ip">{registro.ip_origen ?? '—'}</td>
                    <td>
                      <button
                        className="aud-enlace"
                        type="button"
                        onClick={() => setDetalle(registro)}
                      >
                        Ver cambios
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <footer className="aud-paginado">
            <button
              type="button"
              onClick={() => cambiarPagina(pagina - 1)}
              disabled={pagina <= 1 || cargando}
            >
              Anterior
            </button>
            <span>
              Página {pagina} de {totalPaginas}
            </span>
            <button
              type="button"
              onClick={() => cambiarPagina(pagina + 1)}
              disabled={pagina >= totalPaginas || cargando}
            >
              Siguiente
            </button>
          </footer>
        </section>
      )}

      {detalle && (
        <Modal
          titulo={detalle.accion}
          subtitulo={`Registro #${detalle.id} · ${detalle.entidad_afectada}${detalle.registro_id !== null ? ` #${detalle.registro_id}` : ''}`}
          onCerrar={() => setDetalle(null)}
          ancho="ancho"
        >
          <div className="aud-panel-contenido">
              <dl className="aud-datos">
                <div>
                  <dt>Usuario</dt>
                  <dd>
                    {detalle.usuario
                      ? `${detalle.usuario.nombre_completo} (${detalle.usuario.email})`
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
