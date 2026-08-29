import { IcChevronRight, IcDoc, IcLeaf, IcPhone, IcServer, IcUsers } from '@shared/ui/icons/icons'

type Accion = {
  titulo: string
  descripcion: string
  color: 'verde' | 'azul' | 'naranja'
  icono: React.ReactNode
  onClick: () => void
}

type Props = {
  onUsuarios: () => void
  onGranjas: () => void
  onGalpones: () => void
  onCrm: () => void
  onSolicitudes: () => void
  onProveedores: () => void
  onCompras: () => void
}

function AccionesAdmin({ onUsuarios, onGranjas, onGalpones, onCrm, onSolicitudes, onProveedores, onCompras }: Props) {
  const acciones: Accion[] = [
    {
      titulo: 'Gestionar usuarios',
      descripcion: 'Crear, editar e inactivar cuentas de propietarios y operarios.',
      color: 'verde',
      icono: <IcUsers size={22} />,
      onClick: onUsuarios,
    },
    {
      titulo: 'Gestionar granjas',
      descripcion: 'Crear granjas y asignarlas al propietario responsable.',
      color: 'azul',
      icono: <IcLeaf size={22} />,
      onClick: onGranjas,
    },
    {
      titulo: 'Galpones',
      descripcion: 'Registrar galpones y gestionar su capacidad e información física.',
      color: 'naranja',
      icono: <IcServer size={22} />,
      onClick: onGalpones,
    },
    {
      titulo: 'CRM · Prospectos',
      descripcion: 'Revisar los contactos comerciales captados por el chatbot.',
      color: 'verde',
      icono: <IcPhone size={22} />,
      onClick: onCrm,
    },
    {
      titulo: 'Solicitudes PQRS',
      descripcion: 'Atender peticiones, quejas, reclamos y sugerencias de prospectos.',
      color: 'azul',
      icono: <IcUsers size={22} />,
      onClick: onSolicitudes,
    },
    {
      titulo: 'Proveedores',
      descripcion: 'Gestionar los aliados de alimento, pollitos, insumos y servicios.',
      color: 'naranja',
      icono: <IcUsers size={22} />,
      onClick: onProveedores,
    },
    {
      titulo: 'Órdenes de compra',
      descripcion: 'Registrar pedidos, sus insumos y la recepción en bodega.',
      color: 'verde',
      icono: <IcDoc size={22} />,
      onClick: onCompras,
    },
  ]

  return (
    <section className="admin-acciones" aria-label="Acciones administrativas">
      {acciones.map((accion) => (
        <button
          key={accion.titulo}
          type="button"
          className={`admin-accion admin-accion--${accion.color}`}
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
    </section>
  )
}

export default AccionesAdmin
