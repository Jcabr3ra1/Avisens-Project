import type { Proveedor } from '../model/proveedor'

type Props = {
  proveedores: Proveedor[]
  onEditar: (proveedor: Proveedor) => void
  onAlternarActivo: (proveedor: Proveedor) => void
  onEliminar: (proveedor: Proveedor) => void
}

function TablaProveedores({ proveedores, onEditar, onAlternarActivo, onEliminar }: Props) {
  return (
    <div className="prv-tabla-scroll">
      <table className="prv-tabla">
        <thead>
          <tr>
            <th>Proveedor</th>
            <th>NIT</th>
            <th>Tipo</th>
            <th>Contacto</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {proveedores.map((proveedor) => (
            <tr key={proveedor.id}>
              <td>
                <strong>{proveedor.nombre}</strong>
                <span>{proveedor.direccion || 'Sin dirección registrada'}</span>
              </td>
              <td>{proveedor.nit}</td>
              <td>{proveedor.tipo_proveedor || 'Sin clasificar'}</td>
              <td>
                <strong>{proveedor.contacto_persona || 'Sin contacto'}</strong>
                <span>{proveedor.telefono || proveedor.email || 'Sin datos de contacto'}</span>
              </td>
              <td>
                <span className={`prv-estado prv-estado--${proveedor.activo ? 'activo' : 'inactivo'}`}>
                  {proveedor.activo ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td>
                <div className="prv-acciones-fila">
                  <button type="button" onClick={() => onEditar(proveedor)}>Editar</button>
                  <button type="button" onClick={() => onAlternarActivo(proveedor)}>
                    {proveedor.activo ? 'Desactivar' : 'Activar'}
                  </button>
                  <button type="button" className="prv-accion-eliminar" onClick={() => onEliminar(proveedor)}>Eliminar</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default TablaProveedores
