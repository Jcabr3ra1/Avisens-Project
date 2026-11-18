import { Link } from 'react-router-dom'
import type { Insumo } from '@features/inventario/api/insumos'
import { ETIQUETA_STOCK, estadoStock } from '@features/inventario/model/inventario'
import { IcBox } from '@shared/ui/icons/icons'

type Props = {
  insumos: Insumo[]
}

// Cuántos insumos se listan antes de mandar a Bodega a ver el resto.
const MAXIMO_VISIBLE = 4

function AvisoStockBajo({ insumos }: Props) {
  if (insumos.length === 0) return null
  const visibles = insumos.slice(0, MAXIMO_VISIBLE)
  const restantes = insumos.length - visibles.length

  return (
    <section className="ale-stock" aria-labelledby="ale-stock-titulo">
      <header className="ale-stock-cabecera">
        <span className="ale-stock-icono" aria-hidden="true"><IcBox size={18} /></span>
        <div>
          <h2 id="ale-stock-titulo">
            {insumos.length === 1 ? '1 insumo por reponer en bodega' : `${insumos.length} insumos por reponer en bodega`}
          </h2>
          <p>Están por debajo de su mínimo. Se resuelven reponiendo el insumo en Bodega.</p>
        </div>
        <Link className="ale-stock-enlace" to="/inventario">Ir a Bodega</Link>
      </header>
      <ul className="ale-stock-lista">
        {visibles.map((insumo) => {
          const estado = estadoStock(insumo)
          return (
            <li key={insumo.id}>
              <span className="ale-stock-nombre">{insumo.nombre}</span>
              <span className="ale-stock-cantidad">
                {insumo.stock_actual.toLocaleString('es-CO')} {insumo.unidad_medida}
                <small> · mín. {insumo.stock_minimo.toLocaleString('es-CO')}</small>
              </span>
              <span className={`ale-stock-estado ale-stock-estado--${estado}`}>{ETIQUETA_STOCK[estado]}</span>
            </li>
          )
        })}
      </ul>
      {restantes > 0 && (
        <p className="ale-stock-mas">
          Y {restantes === 1 ? 'otro insumo' : `${restantes} insumos más`} en Bodega.
        </p>
      )}
    </section>
  )
}

export default AvisoStockBajo
