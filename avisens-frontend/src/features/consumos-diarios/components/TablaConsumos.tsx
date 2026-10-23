import type { PermisosRegistro } from '@shared/auth/permisos'
import type { ConsumoDiario } from '../model/consumoDiario'

type Props = {
  consumos: ConsumoDiario[]
  permisos: PermisosRegistro
  onEditar: (consumo: ConsumoDiario) => void
  onEliminar: (consumo: ConsumoDiario) => void
}

function fechaLegible(fecha: string) {
  return new Date(`${fecha.slice(0, 10)}T12:00:00`).toLocaleDateString('es-CO')
}

function TablaConsumos({ consumos, permisos, onEditar, onEliminar }: Props) {
  const hayAcciones = permisos.editar || permisos.eliminar
  return (
    <div className="cd-scroll">
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Lote</th>
            <th>Alimento</th>
            <th>Consumo</th>
            <th>Agua</th>
            {hayAcciones && <th>Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {consumos.map((c) => (
            <tr key={c.id}>
              <td>{fechaLegible(c.fecha)}</td>
              <td><b>{c.lote.codigo}</b></td>
              <td>{c.tipo_alimento?.nombre ?? 'Sin alimento'}</td>
              <td>{c.alimento_kg === null ? '—' : `${Number(c.alimento_kg).toLocaleString('es-CO')} kg`}</td>
              <td>{c.agua_litros === null ? '—' : `${Number(c.agua_litros).toLocaleString('es-CO')} L`}</td>
              {hayAcciones && (
                <td>
                  <div>
                    {permisos.editar && (
                      <button type="button" onClick={() => onEditar(c)}>Editar</button>
                    )}
                    {permisos.eliminar && (
                      <button className="cd-borrar" type="button" onClick={() => onEliminar(c)}>Eliminar</button>
                    )}
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

export default TablaConsumos
