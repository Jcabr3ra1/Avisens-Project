import { useMemo } from 'react'
import {
  CRITERIOS_EVALUACION,
  ETIQUETA_SEMAFORO,
  NOTA_MAXIMA,
  desempenoPorProveedor,
  pendienteDeEvaluar,
} from '../model/evaluacionProveedor'
import type { OrdenCompra } from '../model/ordenCompra'

type Props = {
  ordenes: OrdenCompra[]
  onVerPendientes: () => void
}

// HU-32 · escenario 2: el historial de desempeño de cada proveedor, con
// semáforo, para decidir a quién comprar con evidencia.
function DesempenoProveedores({ ordenes, onVerPendientes }: Props) {
  const desempeno = useMemo(() => desempenoPorProveedor(ordenes), [ordenes])
  const pendientes = useMemo(() => ordenes.filter(pendienteDeEvaluar).length, [ordenes])

  if (desempeno.length === 0 && pendientes === 0) return null

  return (
    <section className="oc-desempeno adm-panel" aria-labelledby="oc-desempeno-titulo">
      <header className="oc-desempeno-cabecera">
        <div>
          <h2 id="oc-desempeno-titulo">Desempeño de proveedores</h2>
          <p>Promedio de lo que calificaste al recibir cada pedido. Verde desde 4, ámbar desde 3, rojo por debajo.</p>
        </div>
        {pendientes > 0 && (
          <button type="button" className="oc-desempeno-pendientes" onClick={onVerPendientes}>
            {pendientes === 1 ? '1 pedido entregado sin evaluar' : `${pendientes} pedidos entregados sin evaluar`}
          </button>
        )}
      </header>

      {desempeno.length === 0 ? (
        <p className="oc-texto-suave">Aún no has calificado ningún pedido. Abre uno entregado para evaluar al proveedor.</p>
      ) : (
        <ul className="oc-desempeno-lista">
          {desempeno.map((proveedor) => (
            <li key={proveedor.proveedorId} className={`oc-desempeno-tarjeta oc-desempeno-tarjeta--${proveedor.semaforo}`}>
              <div className="oc-desempeno-nombre">
                <strong>{proveedor.nombre}</strong>
                <span>NIT {proveedor.nit} · {proveedor.evaluaciones} {proveedor.evaluaciones === 1 ? 'pedido evaluado' : 'pedidos evaluados'}</span>
              </div>
              <span className={`oc-semaforo oc-semaforo--${proveedor.semaforo}`}>
                <span className="oc-semaforo-luz" aria-hidden="true" />
                {proveedor.promedio.toLocaleString('es-CO')} / {NOTA_MAXIMA} · {ETIQUETA_SEMAFORO[proveedor.semaforo]}
              </span>
              <dl className="oc-evaluacion-notas">
                {CRITERIOS_EVALUACION.map(({ campo, etiqueta }) => (
                  <div key={campo}>
                    <dt>{etiqueta}</dt>
                    <dd>{proveedor.criterios[campo].toLocaleString('es-CO')}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default DesempenoProveedores
