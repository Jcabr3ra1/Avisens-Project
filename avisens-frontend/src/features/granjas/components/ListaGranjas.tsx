import { IcPin } from '@shared/ui/icons/icons'
import type { Granja } from '../api/granjas'

interface Props {
  granjas: Granja[]
  onEditar: (granja: Granja) => void
  onAlternar: (granja: Granja) => void
  onEliminar: (granja: Granja) => void
  onVerGalpones: (granja: Granja) => void
  puedeGestionar: boolean
}

function ListaGranjas({ granjas, onEditar, onAlternar, onEliminar, onVerGalpones, puedeGestionar }: Props) {
  if (granjas.length === 0) return <p className="grj-vacio">No hay granjas registradas.</p>

  return (
    <section className="grj-lista" aria-label="Granjas registradas">
      {granjas.map((granja) => (
        <article key={granja.id} className={`grj-card${granja.activa ? '' : ' grj-card--inactiva'}`}>
          <div className="grj-card-info">
            <div>
              <h2>{granja.nombre}</h2>
              {!granja.activa && <span className="grj-estado">Inactiva</span>}
            </div>
            <p><IcPin size={14} aria-hidden="true" /> {granja.municipio ?? '—'}, {granja.departamento ?? '—'}</p>
            {granja.direccion && <p>{granja.direccion}</p>}
          </div>
          <div className="grj-card-meta">
            <span>{granja.area_total_m2 !== null ? `${granja.area_total_m2.toLocaleString()} m²` : 'Área sin registrar'}</span>
            <div className="grj-acciones">
              <button type="button" className="grj-ver-hijos" onClick={() => onVerGalpones(granja)}>Ver galpones</button>
              {puedeGestionar && (
                <>
                  <button type="button" onClick={() => onEditar(granja)}>Editar</button>
                  <button type="button" onClick={() => onAlternar(granja)}>
                    {granja.activa ? 'Desactivar' : 'Activar'}
                  </button>
                  <button type="button" className="grj-peligro" onClick={() => onEliminar(granja)}>
                    Eliminar
                  </button>
                </>
              )}
            </div>
          </div>
        </article>
      ))}
    </section>
  )
}

export default ListaGranjas
