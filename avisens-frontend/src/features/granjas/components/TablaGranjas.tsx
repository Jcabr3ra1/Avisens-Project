import { IcPin } from '@shared/ui/icons/icons'
import TablaGestion, { type ColumnaGestion } from '@shared/ui/TablaGestion/TablaGestion'
import EstadoBadge from '@shared/ui/TablaGestion/EstadoBadge'
import '@shared/ui/TablaGestion/TablaGestion.css'
import type { Granja } from '../api/granjas'

interface Props {
  granjas: Granja[]
  cargando: boolean
  onEditar: (granja: Granja) => void
  onAlternar: (granja: Granja) => void
  onEliminar: (granja: Granja) => void
  onVerGalpones: (granja: Granja) => void
  puedeGestionar: boolean
}

function TablaGranjas({
  granjas,
  cargando,
  onEditar,
  onAlternar,
  onEliminar,
  onVerGalpones,
  puedeGestionar,
}: Props) {
  const columnas: ColumnaGestion<Granja>[] = [
    { encabezado: 'Nombre', render: (granja) => <strong>{granja.nombre}</strong> },
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
          <button type="button" className="tg-btn tg-btn--destacado" onClick={() => onVerGalpones(granja)}>
            Ver galpones
          </button>
          {puedeGestionar && (
            <>
              <button type="button" className="tg-btn" onClick={() => onEditar(granja)}>Editar</button>
              <button type="button" className="tg-btn" onClick={() => onAlternar(granja)}>
                {granja.activa ? 'Desactivar' : 'Activar'}
              </button>
              <button type="button" className="tg-btn tg-btn--peligro" onClick={() => onEliminar(granja)}>
                Eliminar
              </button>
            </>
          )}
        </>
      )}
    />
  )
}

export default TablaGranjas
