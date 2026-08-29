import type { Lote } from '../api/lotes'

interface Props {
  lotes: Lote[]
  cargando: boolean
  onEditar: (lote: Lote) => void
  onAlternar: (lote: Lote) => void
  onEliminar: (lote: Lote) => void
}

function TablaLotes({ lotes, cargando, onEditar, onAlternar, onEliminar }: Props) {
  if (cargando) return <p className="lotes-vacio">Cargando lotes…</p>
  if (lotes.length === 0) return <p className="lotes-vacio">No hay lotes para mostrar.</p>

  return (
    <div className="lotes-tabla-wrap">
      <table className="lotes-tabla">
        <thead>
          <tr>
            <th>Código</th>
            <th>Galpón</th>
            <th>Proveedor</th>
            <th>Ingreso</th>
            <th>Aves</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {lotes.map((lote) => (
            <tr key={lote.id}>
              <td><code>{lote.codigo}</code></td>
              <td>{lote.galpon.nombre}</td>
              <td>{lote.proveedor.nombre}</td>
              <td>{lote.fecha_ingreso.slice(0, 10)}</td>
              <td>{lote.cantidad_inicial.toLocaleString()}</td>
              <td><span className={`lotes-estado lotes-estado--${lote.estado}`}>{lote.estado}</span></td>
              <td>
                <div className="lotes-acciones">
                  <button type="button" onClick={() => onEditar(lote)}>Editar</button>
                  <button type="button" onClick={() => onAlternar(lote)}>
                    {lote.estado === 'activo' ? 'Desactivar' : 'Activar'}
                  </button>
                  <button type="button" className="lotes-peligro" onClick={() => onEliminar(lote)}>Eliminar</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default TablaLotes
