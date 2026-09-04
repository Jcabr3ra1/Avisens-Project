import type { ReactNode } from 'react'
import { IcBox } from '@shared/ui/icons/icons'

export type ColumnaGestion<T> = {
  encabezado: string
  render: (item: T) => ReactNode
  alinear?: 'izquierda' | 'centro'
}

type Props<T> = {
  items: T[]
  columnas: ColumnaGestion<T>[]
  claveFila: (item: T) => string | number
  cargando: boolean
  mensajeVacio: string
  pistaVacio?: string
  renderAcciones?: (item: T) => ReactNode
  filaClase?: (item: T) => string | undefined
}

function TablaGestion<T>({
  items,
  columnas,
  claveFila,
  cargando,
  mensajeVacio,
  pistaVacio,
  renderAcciones,
  filaClase,
}: Props<T>) {
  if (cargando) return <p className="tg-vacio">Cargando…</p>

  if (items.length === 0) {
    return (
      <div className="tg-vacio">
        <span className="tg-vacio-icono" aria-hidden="true">
          <IcBox size={20} />
        </span>
        <strong>{mensajeVacio}</strong>
        {pistaVacio && <span>{pistaVacio}</span>}
      </div>
    )
  }

  return (
    <div className="tg-tabla-wrap">
      <table className="tg-tabla">
        <thead>
          <tr>
            {columnas.map((columna) => (
              <th
                key={columna.encabezado}
                className={columna.alinear === 'centro' ? 'tg-centro' : undefined}
              >
                {columna.encabezado}
              </th>
            ))}
            {renderAcciones && <th aria-label="Acciones" />}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={claveFila(item)} className={filaClase?.(item)}>
              {columnas.map((columna) => (
                <td
                  key={columna.encabezado}
                  className={columna.alinear === 'centro' ? 'tg-centro' : undefined}
                >
                  {columna.render(item)}
                </td>
              ))}
              {renderAcciones && (
                <td>
                  <div className="tg-acciones">{renderAcciones(item)}</div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default TablaGestion
