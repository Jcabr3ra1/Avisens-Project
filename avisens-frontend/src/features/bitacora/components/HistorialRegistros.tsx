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

function HistorialRegistros({ titulo, codigoLote, filas, permisos, onNuevo, onEditar, onEliminar, resaltadoId = null }: Props) {
  return (
    <section className="bit-card bit-historial" aria-labelledby="bit-historial-titulo">
      <header className="bit-seccion-cab">
        <div>
          <p className="bit-kicker">Historial</p>
          <h2 id="bit-historial-titulo">{titulo}</h2>
          <p>Registros del lote {codigoLote}.</p>
        </div>
        <button type="button" className="bit-principal" onClick={onNuevo}>Nuevo registro</button>
      </header>
      {filas.length === 0 ? (
        <p className="bit-vacio">Aún no hay registros en esta sección.</p>
      ) : (
        <div className="bit-lista">
          {filas.map((fila) => (
            <article key={fila.id} className={fila.id === resaltadoId ? 'is-resaltado' : undefined}>
              <time>{fechaLegible(fila.fecha)}</time>
              <strong>{fila.principal}</strong>
              <span>{fila.detalle}</span>
              <span className="bit-fila-acciones">
                {permisos.editar && (
                  <button type="button" className="bit-editar" onClick={() => onEditar(fila.id)}>Editar</button>
                )}
                {permisos.eliminar && (
                  <button type="button" onClick={() => onEliminar(fila.id)}>Eliminar</button>
                )}
              </span>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default HistorialRegistros
