import { IcUsers } from '@shared/ui/icons/icons'
import type { Proveedor } from '../model/proveedor'

type Props = {
  proveedores: Proveedor[]
}

function ResumenProveedores({ proveedores }: Props) {
  const activos = proveedores.filter((proveedor) => proveedor.activo).length
  const inactivos = proveedores.length - activos

  return (
    <section className="prv-resumen" aria-labelledby="prv-titulo">
      <div className="prv-resumen-intro">
        <span className="prv-resumen-icono" aria-hidden="true"><IcUsers size={24} /></span>
        <div>
          <p>Catálogo administrativo</p>
          <h1 id="prv-titulo">Proveedores</h1>
          <span>Centraliza los aliados de alimento, pollitos, insumos y servicios.</span>
        </div>
      </div>
      <div className="prv-estadisticas" aria-label="Resumen de proveedores">
        <div><strong>{proveedores.length}</strong><span>Total</span></div>
        <div><strong>{activos}</strong><span>Activos</span></div>
        <div><strong>{inactivos}</strong><span>Inactivos</span></div>
      </div>
    </section>
  )
}

export default ResumenProveedores
