import type { Galpon } from '../api/galpones'

interface Props {
  galpones: Galpon[]
  cargando: boolean
  onEditar: (galpon: Galpon) => void
  onAlternar: (galpon: Galpon) => void
  onEliminar: (galpon: Galpon) => void
  onVerSensores: (galpon: Galpon) => void
}

function TablaGalpones({ galpones, cargando, onEditar, onAlternar, onEliminar, onVerSensores }: Props) {
  if (cargando) return <p className="galpones-vacio">Cargando galpones…</p>
  if (galpones.length === 0) return <p className="galpones-vacio">No hay galpones para mostrar.</p>

  return (
    <div className="galpones-tabla-wrap">
      <table className="galpones-tabla">
        <thead>
          <tr><th>Código</th><th>Nombre</th><th>Granja</th><th>Área</th><th>Capacidad</th><th>Estado</th><th>Acciones</th></tr>
        </thead>
        <tbody>
          {galpones.map((galpon) => {
            const area = galpon.ancho_metros !== null && galpon.largo_metros !== null
              ? galpon.ancho_metros * galpon.largo_metros
              : null
            return (
              <tr key={galpon.id}>
                <td><code>{galpon.codigo}</code></td>
                <td>{galpon.nombre}</td>
                <td>{galpon.granja.nombre}</td>
                <td>{area !== null ? `${area.toLocaleString()} m²` : '—'}</td>
                <td>{galpon.capacidad_aves?.toLocaleString() ?? '—'}</td>
                <td><span className={`galpones-estado galpones-estado--${galpon.activo ? 'activo' : 'inactivo'}`}>{galpon.activo ? 'Activo' : 'Inactivo'}</span></td>
                <td>
                  <div className="galpones-acciones">
                    <button type="button" onClick={() => onVerSensores(galpon)}>Sensores</button>
                    <button type="button" onClick={() => onEditar(galpon)}>Editar</button>
                    <button type="button" onClick={() => onAlternar(galpon)}>{galpon.activo ? 'Desactivar' : 'Activar'}</button>
                    <button type="button" className="galpones-peligro" onClick={() => onEliminar(galpon)}>Eliminar</button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default TablaGalpones
