import { Link } from 'react-router-dom'
import { IcChevronRight, IcPin } from '@shared/ui/icons/icons'
import TablaGestion, { type ColumnaGestion } from '@shared/ui/TablaGestion/TablaGestion'
import EstadoBadge from '@shared/ui/TablaGestion/EstadoBadge'
import '@shared/ui/TablaGestion/TablaGestion.css'
import type { PermisosGestion } from '@shared/auth/permisos'
import type { Granja } from '../api/granjas'

interface Props {
  granjas: Granja[]
  cargando: boolean
  onEditar: (granja: Granja) => void
  onAlternar: (granja: Granja) => void
  onEliminar: (granja: Granja) => void
  permisos: PermisosGestion
}

function TablaGranjas({
  granjas,
  cargando,
  onEditar,
  onAlternar,
  onEliminar,
  permisos,
}: Props) {
  const columnas: ColumnaGestion<Granja>[] = [
    {
      encabezado: 'Nombre',
      // El nombre es la puerta a la granja: no hace falta un botón "Ver".
      render: (granja) => (
        <Link className="grj-enlace" to={`/granjas/${granja.id}`}>
          <strong>{granja.nombre}</strong>
          <IcChevronRight size={14} aria-hidden="true" />
        </Link>
      ),
    },
    {
      encabezado: 'Ubicación',
      render: (granja) => (
        <span className="tg-ubicacion">
          <IcPin size={14} aria-hidden="true" />
          {granja.municipio ?? '—'}, {granja.departamento ?? '—'}
        </span>
      ),
    },
    {
      encabezado: 'Área',
      render: (granja) =>
        granja.area_total_m2 !== null ? `${granja.area_total_m2.toLocaleString()} m²` : '—',
    },
    {
      encabezado: 'Estado',
      render: (granja) => <EstadoBadge estado={granja.activa ? 'activa' : 'inactiva'} />,
    },
  ]

  return (
    <TablaGestion
      items={granjas}
      columnas={columnas}
      claveFila={(granja) => granja.id}
      cargando={cargando}
      mensajeVacio="No hay granjas registradas."
      filaClase={(granja) => (granja.activa ? undefined : 'tg-fila-inactiva')}
      renderAcciones={(granja) => (
        <>
          {permisos.editar && (
            <button type="button" className="tg-btn" onClick={() => onEditar(granja)}>Editar</button>
          )}
          {permisos.alternarActivo && (
            <button type="button" className="tg-btn" onClick={() => onAlternar(granja)}>
              {granja.activa ? 'Desactivar' : 'Activar'}
            </button>
          )}
          {permisos.eliminar && (
            <button type="button" className="tg-btn tg-btn--peligro" onClick={() => onEliminar(granja)}>
              Eliminar
            </button>
          )}
        </>
      )}
    />
  )
}

export default TablaGranjas
