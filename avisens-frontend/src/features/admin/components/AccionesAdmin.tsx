import { IcChevronRight, IcDoc, IcLeaf, IcPhone, IcUsers } from '@shared/ui/icons/icons'

type Accion = {
  titulo: string
  descripcion: string
  icono: React.ReactNode
  onClick: () => void
}

type Props = {
  onUsuarios: () => void
  onGranjas: () => void
  onCrm: () => void
  onProveedores: () => void
  onCompras: () => void
}

function AccionesAdmin({ onUsuarios, onGranjas, onCrm, onProveedores, onCompras }: Props) {
  const acciones: Accion[] = [
    {
      titulo: 'Personas',
      descripcion: 'Gestiona cuentas de equipo y clientes.',
      icono: <IcUsers size={22} />,
      onClick: onUsuarios,
    },
    {
      titulo: 'Granjas',
      descripcion: 'Crea granjas y asigna responsables.',
      icono: <IcLeaf size={22} />,
      onClick: onGranjas,
    },
    {
      titulo: 'Clientes y PQRS',
      descripcion: 'Consulta prospectos, cotizaciones y PQRS.',
      icono: <IcPhone size={22} />,
      onClick: onCrm,
    },
    {
      titulo: 'Proveedores',
      descripcion: 'Gestiona aliados, insumos y servicios.',
      icono: <IcUsers size={22} />,
      onClick: onProveedores,
    },
    {
      titulo: 'Compras',
      descripcion: 'Registra pedidos y controla su recepción en bodega.',
      icono: <IcDoc size={22} />,
      onClick: onCompras,
    },
  ]

  return (
    <section className="admin-card admin-management" aria-labelledby="admin-management-title">
      <div className="admin-card-head">
        <div>
          <h2 id="admin-management-title" className="admin-card-title">Gestión</h2>
          <p className="admin-card-sub">Accesos frecuentes organizados por tarea</p>
        </div>
      </div>
      <div className="admin-actions">
        {acciones.map((accion) => (
          <button
            key={accion.titulo}
            type="button"
            className="admin-accion"
            onClick={accion.onClick}
          >
            <span className="admin-accion-icon">{accion.icono}</span>
            <span className="admin-accion-text">
              <strong>{accion.titulo}</strong>
              <span>{accion.descripcion}</span>
            </span>
            <IcChevronRight size={16} className="admin-accion-arrow" />
          </button>
        ))}
      </div>
    </section>
  )
}

export default AccionesAdmin
