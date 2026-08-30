import { IcChevronRight, IcLeaf, IcPin } from '@shared/ui/icons/icons'
import type { Granja } from '@features/granjas/api/granjas'

type Props = {
  granjas: Granja[]
  onAbrirGranja: (granja: Granja) => void
}

function ubicacion(granja: Granja): string {
  const partes = [granja.municipio, granja.departamento].filter(Boolean)
  return partes.length > 0 ? partes.join(', ') : 'Sin ubicación registrada'
}

function GranjasDelPropietario({ granjas, onAbrirGranja }: Props) {
  if (granjas.length === 0) {
    return <p className="admin-hija-vacio">Este propietario aún no tiene granjas asignadas.</p>
  }

  return (
    <ul className="admin-hija-lista">
      {granjas.map((granja) => (
        <li key={granja.id}>
          <button
            type="button"
            className="admin-hija-granja"
            onClick={() => onAbrirGranja(granja)}
          >
            <span className="admin-hija-granja-icono"><IcLeaf size={18} /></span>
            <span className="admin-hija-granja-texto">
              <strong>{granja.nombre}</strong>
              <span><IcPin size={12} /> {ubicacion(granja)}</span>
            </span>
            <span className={`admin-hija-estado${granja.activa ? ' es-activa' : ''}`}>
              {granja.activa ? 'Activa' : 'Inactiva'}
            </span>
            <IcChevronRight size={15} className="admin-hija-flecha" />
          </button>
        </li>
      ))}
    </ul>
  )
}

export default GranjasDelPropietario
