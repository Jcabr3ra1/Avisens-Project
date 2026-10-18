import {
  IcChevronRight,
  IcNote,
  IcPhone,
  IcSearch,
  IcServer,
  IcUserCircle,
  IcUsers,
} from '@shared/ui/icons/icons'

type Accion = {
  titulo: string
  descripcion: string
  etiqueta: string
  icono: React.ReactNode
  onClick: () => void
}

type Props = {
  onOrganizaciones: () => void
  onCrm: () => void
  onUsuarios: () => void
  onCatalogos: () => void
  onAuditoria: () => void
  onProveedores: () => void
}

function AccionesAdmin({
  onOrganizaciones,
  onCrm,
  onUsuarios,
  onCatalogos,
  onAuditoria,
  onProveedores,
}: Props) {
  const acciones: Accion[] = [
    {
      titulo: 'Organizaciones',
      descripcion: 'Administra empresas avícolas, sus granjas, galpones y dispositivos IoT.',
      etiqueta: 'Clientes',
      icono: <IcServer size={20} />,
      onClick: onOrganizaciones,
    },
    {
      titulo: 'Prospectos CRM',
      descripcion: 'Califica leads del chatbot, gestiona cotizaciones y conviértelos en clientes.',
      etiqueta: 'Comercial',
      icono: <IcPhone size={20} />,
      onClick: onCrm,
    },
    {
      titulo: 'Personas y Accesos',
      descripcion: 'Crea cuentas de propietarios y operarios y atiende recuperaciones de clave.',
      etiqueta: 'Seguridad',
      icono: <IcUserCircle size={20} />,
      onClick: onUsuarios,
    },
    {
      titulo: 'Catálogos Maestros',
      descripcion: 'Configura curvas de crecimiento genético, tipos de alimento e insumos base.',
      etiqueta: 'Plataforma',
      icono: <IcNote size={20} />,
      onClick: onCatalogos,
    },
    {
      titulo: 'Auditoría y Trazabilidad',
      descripcion: 'Inspecciona el historial inmutable de cambios y eventos críticos del sistema.',
      etiqueta: 'Control',
      icono: <IcSearch size={20} />,
      onClick: onAuditoria,
    },
    {
      titulo: 'Proveedores y Aliados',
      descripcion: 'Gestiona el directorio de empresas abastecedoras de alimento y equipos.',
      etiqueta: 'Abastecimiento',
      icono: <IcUsers size={20} />,
      onClick: onProveedores,
    },
  ]

  return (
    <section className="admin-card admin-management" aria-labelledby="admin-management-title">
      <div className="admin-card-head">
        <div>
          <h2 id="admin-management-title" className="admin-card-title">
            Módulos de plataforma
          </h2>
          <p className="admin-card-sub">
            Accesos directos a las herramientas exclusivas del rol Administrador
          </p>
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
            <span className="admin-accion-icon" aria-hidden="true">
              {accion.icono}
            </span>
            <span className="admin-accion-text">
              <span className="admin-accion-top">
                <strong>{accion.titulo}</strong>
                <small className="admin-accion-tag">{accion.etiqueta}</small>
              </span>
              <span>{accion.descripcion}</span>
            </span>
            <IcChevronRight size={16} className="admin-accion-arrow" aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  )
}

export default AccionesAdmin
