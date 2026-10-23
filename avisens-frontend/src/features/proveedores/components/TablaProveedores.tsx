import MenuAcciones from '@shared/ui/MenuAcciones/MenuAcciones'
import type { Proveedor } from '../model/proveedor'

type Props = {
  proveedores: Proveedor[]
  // Sin gestión (el operario) la tabla es de consulta: el estado se lee como
  // etiqueta y no hay columna de acciones.
  gestionar: boolean
  onEditar: (proveedor: Proveedor) => void
  onAlternarActivo: (proveedor: Proveedor) => void
  onEliminar: (proveedor: Proveedor) => void
}

function iniciales(nombre: string): string {
  return nombre.trim().split(/\s+/).slice(0, 2).map((parte) => parte[0]?.toUpperCase()).join('') || '—'
}

function TablaProveedores({ proveedores, gestionar, onEditar, onAlternarActivo, onEliminar }: Props) {
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
            {gestionar && <th><span className="sr-only">Acciones</span></th>}
          </tr>
        </thead>
        <tbody>
          {proveedores.map((proveedor) => (
            <tr key={proveedor.id} className={proveedor.activo ? undefined : 'is-inactivo'}>
              <td>
                <div className="prv-celda-proveedor">
                  <span className="prv-avatar" aria-hidden="true">{iniciales(proveedor.nombre)}</span>
                  <span className="prv-celda-texto">
                    <strong>{proveedor.nombre}</strong>
                    <span>{proveedor.direccion || 'Sin dirección registrada'}</span>
                  </span>
                </div>
              </td>
              <td className="prv-num">{proveedor.nit}</td>
              <td>
                <span className={`prv-tipo${proveedor.tipo_proveedor ? '' : ' is-vacio'}`}>{proveedor.tipo_proveedor || 'Sin clasificar'}</span>
              </td>
              <td>
                <span className="prv-celda-texto prv-celda-texto--centro">
                  <strong>{proveedor.contacto_persona || 'Sin contacto'}</strong>
                  <span>{proveedor.telefono || proveedor.email || 'Sin teléfono ni correo'}</span>
                </span>
              </td>
              <td>
                {gestionar ? (
                  <label className="prv-interruptor">
                    <input
                      type="checkbox"
                      checked={proveedor.activo}
                      onChange={() => onAlternarActivo(proveedor)}
                      aria-label={`${proveedor.activo ? 'Desactivar' : 'Activar'} ${proveedor.nombre}`}
                    />
                    <span className="prv-interruptor-riel" aria-hidden="true" />
                    <span className={`prv-estado prv-estado--${proveedor.activo ? 'activo' : 'inactivo'}`}>{proveedor.activo ? 'Activo' : 'Inactivo'}</span>
                  </label>
                ) : (
                  <span className={`prv-estado prv-estado--${proveedor.activo ? 'activo' : 'inactivo'}`}>{proveedor.activo ? 'Activo' : 'Inactivo'}</span>
                )}
              </td>
              {gestionar && (
                <td>
                  <div className="prv-acciones">
                    <MenuAcciones
                      etiqueta={`Acciones de ${proveedor.nombre}`}
                      acciones={[
                        { etiqueta: 'Editar', onSeleccionar: () => onEditar(proveedor) },
                        { etiqueta: 'Eliminar', onSeleccionar: () => onEliminar(proveedor), peligrosa: true },
                      ]}
                    />
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default TablaProveedores
