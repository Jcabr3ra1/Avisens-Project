import type { PermisosRegistro } from '@shared/auth/permisos'
import type { FilaRegistro } from '../model/resumenBitacora'

type Props = {
  titulo: string
  codigoLote: string
  filas: FilaRegistro[]
  permisos: PermisosRegistro
  onNuevo: () => void
  onEditar: (id: number) => void
  onEliminar: (id: number) => void
  resaltadoId?: number | null
}

function fechaLegible(fecha: string) {
  return new Date(`${fecha.slice(0, 10)}T12:00:00`).toLocaleDateString('es-CO')
}

function HistorialRegistros({
  titulo,
  codigoLote,
  filas,
  permisos,
  onNuevo,
  onEditar,
  onEliminar,
  resaltadoId = null,
}: Props) {
  const hayAcciones = permisos.editar || permisos.eliminar

  return (
    <section className="bit-card bit-historial" aria-labelledby="bit-historial-titulo">
      <header className="bit-seccion-cab">
        <div className="bit-seccion-titulos">
          <p className="bit-kicker">Historial</p>
          <div className="bit-titulo-con-conteo">
            <h2 id="bit-historial-titulo">{titulo}</h2>
            <span className="bit-conteo">{filas.length}</span>
          </div>
          <p className="bit-seccion-sub">Registros del lote {codigoLote}.</p>
        </div>
        <button type="button" className="adm-btn adm-btn--primario" onClick={onNuevo}>
          + Nuevo registro
        </button>
      </header>

      {filas.length === 0 ? (
        <div className="bit-vacio-interno">
          <strong>Aún no hay registros en esta sección</strong>
          <p>Usa «+ Nuevo registro» para anotar el primer movimiento de {titulo.toLowerCase()}.</p>
        </div>
      ) : (
        <div className="bit-tabla-wrap">
          <table className="bit-tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Registro</th>
                <th>Detalle</th>
                {hayAcciones && <th className="bit-col-acciones">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {filas.map((fila) => (
                <tr key={fila.id} className={fila.id === resaltadoId ? 'is-resaltado' : undefined}>
                  <td className="bit-celda-fecha">
                    <time>{fechaLegible(fila.fecha)}</time>
                  </td>
                  <td className="bit-celda-principal">
                    <strong>{fila.principal}</strong>
                  </td>
                  <td className="bit-celda-detalle">{fila.detalle}</td>
                  {hayAcciones && (
                    <td className="bit-col-acciones">
                      <span className="bit-fila-acciones">
                        {permisos.editar && (
                          <button
                            type="button"
                            className="adm-btn-fila"
                            onClick={() => onEditar(fila.id)}
                          >
                            Editar
                          </button>
                        )}
                        {permisos.eliminar && (
                          <button
                            type="button"
                            className="adm-btn-fila adm-btn-fila--peligro"
                            onClick={() => onEliminar(fila.id)}
                          >
                            Eliminar
                          </button>
                        )}
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default HistorialRegistros
