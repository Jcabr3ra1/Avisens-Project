import type { ReactNode } from 'react'

export type ColumnaGestion<T> = {
  encabezado: string
  render: (item: T) => ReactNode
  // Columnas como "Estado" se ven mejor centradas; el resto se alinean a la
  // izquierda por defecto, que es como se lee texto.
  alinear?: 'izquierda' | 'centro'
}

type Props<T> = {
  items: T[]
  columnas: ColumnaGestion<T>[]
  claveFila: (item: T) => string | number
  cargando: boolean
  mensajeVacio: string
  // Sin acciones, la columna ni siquiera se dibuja: una tabla de solo
  // lectura no necesita una columna vacía "Acciones" al final.
  renderAcciones?: (item: T) => ReactNode
  filaClase?: (item: T) => string | undefined
}

/**
 * Tabla de gestión compartida por las pantallas de administración
 * (granjas, galpones, lotes, usuarios…). Antes cada una tenía su propio
 * <table> con clases casi idénticas y un botón "Eliminar" con su propio
 * color rojo reinventado — de ahí que la app se sintiera inconsistente
 * aunque ninguna pantalla estuviera "mal hecha" por separado.
 */
function TablaGestion<T>({
  items,
  columnas,
  claveFila,
  cargando,
  mensajeVacio,
  renderAcciones,
  filaClase,
}: Props<T>) {
  if (cargando) return <p className="tg-vacio">Cargando…</p>
  if (items.length === 0) return <p className="tg-vacio">{mensajeVacio}</p>

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
