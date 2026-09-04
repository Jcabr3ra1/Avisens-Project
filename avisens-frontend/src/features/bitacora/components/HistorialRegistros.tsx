import type { FilaRegistro } from '../model/resumenBitacora'

type Props = {
  titulo: string
  codigoLote: string
  filas: FilaRegistro[]
  onNuevo: () => void
  onEliminar: (id: number) => void
}

function fechaLegible(fecha: string) {
  return new Date(`${fecha.slice(0, 10)}T12:00:00`).toLocaleDateString('es-CO')
}

function HistorialRegistros({ titulo, codigoLote, filas, onNuevo, onEliminar }: Props) {
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
            <article key={fila.id}>
              <time>{fechaLegible(fila.fecha)}</time>
              <strong>{fila.principal}</strong>
              <span>{fila.detalle}</span>
              <button type="button" onClick={() => onEliminar(fila.id)}>Eliminar</button>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default HistorialRegistros
