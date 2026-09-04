import { IcAlert, IcChevronRight, IcPin } from '@shared/ui/icons/icons'
import type { GranjaConEstructura } from '../hooks/useEstructuraGranjas'

type Props = {
  estructura: GranjaConEstructura[]
  granjaSeleccionadaId: number | null
  onSeleccionar: (granjaId: number) => void
}

function estadoDe(item: GranjaConEstructura) {
  if (!item.granja.activa) return { texto: 'Inactiva', tono: 'neutral' }
  if (item.galpones.length === 0) return { texto: 'Sin galpón', tono: 'aviso' }
  if (item.lotesActivos === 0) return { texto: 'Sin lote', tono: 'info' }
  return { texto: 'Operativa', tono: 'activo' }
}

function TablaControlGranjas({ estructura, granjaSeleccionadaId, onSeleccionar }: Props) {
  if (estructura.length === 0) {
    return <p className="grj-tabla-vacia">No hay granjas que coincidan con la búsqueda.</p>
  }

  return (
    <div className="grj-tabla-scroll">
      <table className="grj-tabla">
        <thead>
          <tr>
            <th scope="col">Granja y propietario</th>
            <th scope="col">Ubicación</th>
            <th scope="col">Estructura</th>
            <th scope="col">Estado</th>
            <th scope="col"><span className="grj-visualmente-oculto">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          {estructura.map((item) => {
            const estado = estadoDe(item)
            const seleccionada = item.granja.id === granjaSeleccionadaId
            return (
              <tr key={item.granja.id} className={seleccionada ? 'is-seleccionada' : undefined}>
                <td>
                  <strong>{item.granja.nombre}</strong>
                  <span>{item.granja.propietario.nombre_completo}</span>
                </td>
                <td>
                  <span className="grj-tabla-lugar"><IcPin size={14} aria-hidden="true" />{item.granja.municipio ?? 'Ubicación pendiente'}</span>
                </td>
                <td>
                  <span>{item.galpones.length} galpones · {item.lotesActivos} lotes activos</span>
                  {item.alertasAbiertas > 0 && (
                    <span className="grj-tabla-alerta"><IcAlert size={13} aria-hidden="true" />{item.alertasAbiertas} alertas</span>
                  )}
                </td>
                <td><span className={`grj-tabla-estado grj-tabla-estado--${estado.tono}`}>{estado.texto}</span></td>
                <td>
                  <button
                    type="button"
                    className="grj-tabla-abrir"
                    onClick={() => onSeleccionar(item.granja.id)}
                    aria-label={`Inspeccionar ${item.granja.nombre}`}
                  >
                    Inspeccionar <IcChevronRight size={15} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default TablaControlGranjas
