import type { OrdenCompra } from '../model/ordenCompra'

type Props = { ordenes: OrdenCompra[]; onAbrir: (orden: OrdenCompra) => void; onCancelar: (orden: OrdenCompra) => void }

const ETIQUETAS = { pendiente: 'Pendiente', en_proceso: 'En recepción', entregada: 'Entregada', cancelada: 'Cancelada' }

function TablaOrdenes({ ordenes, onAbrir, onCancelar }: Props) {
  return (
    <div className="oc-tabla-scroll"><table className="oc-tabla"><thead><tr><th>Orden</th><th>Proveedor</th><th>Granja</th><th>Entrega</th><th>Valor</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
      {ordenes.map((orden) => <tr key={orden.id}>
        <td><strong>{orden.codigo}</strong><span>{orden.detalles.length} insumo{orden.detalles.length === 1 ? '' : 's'}</span></td>
        <td>{orden.proveedor.nombre}</td><td>{orden.granja.nombre}</td>
        <td>{orden.fecha_entrega_estimada ? new Date(`${orden.fecha_entrega_estimada.slice(0, 10)}T12:00:00`).toLocaleDateString('es-CO') : 'Sin fecha'}</td>
        <td>{Number(orden.valor_total_cop ?? 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}</td>
        <td><span className={`oc-estado oc-estado--${orden.estado}`}>{ETIQUETAS[orden.estado]}</span></td>
        <td><div className="oc-acciones-fila"><button type="button" onClick={() => onAbrir(orden)}>Ver</button>{orden.estado === 'pendiente' && <button type="button" className="oc-accion-cancelar" onClick={() => onCancelar(orden)}>Cancelar</button>}</div></td>
      </tr>)}
    </tbody></table></div>
  )
}

export default TablaOrdenes
