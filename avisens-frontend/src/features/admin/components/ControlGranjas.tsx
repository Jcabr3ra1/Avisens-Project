import { IcChevronRight, IcLeaf } from '@shared/ui/icons/icons'
import type { ResumenPropietario } from '../model/adminResumen'

type Props = {
  propietarios: ResumenPropietario[]
  propietariosSinGranja: number
  cargando: boolean
  onGestionar: () => void
  onAbrirPropietario: (propietario: ResumenPropietario) => void
}

function ControlGranjas({
  propietarios,
  propietariosSinGranja,
  cargando,
  onGestionar,
  onAbrirPropietario,
}: Props) {
  return (
    <section className="admin-card admin-control-granjas" aria-label="Control de granjas por propietario">
      <div className="admin-card-head">
        <span className="admin-card-title"><IcLeaf size={15} /> Control de granjas</span>
        <button type="button" className="admin-card-link" onClick={onGestionar}>
          Gestionar <IcChevronRight size={13} />
        </button>
      </div>
      <p className="admin-card-sub">Granjas registradas y activas por propietario</p>

      {cargando ? (
        <p className="admin-control-vacio" role="status">Cargando granjas…</p>
      ) : propietarios.length === 0 ? (
        <p className="admin-control-vacio">Aún no hay propietarios registrados.</p>
      ) : (
        <ul className="admin-control-lista">
          {propietarios.map((propietario) => (
            <li key={propietario.id}>
              <button
                type="button"
                className="admin-control-fila"
                onClick={() => onAbrirPropietario(propietario)}
              >
                <span className="admin-control-propietario">{propietario.nombre}</span>
                <span className="admin-control-datos">
                  {propietario.totalGranjas} {propietario.totalGranjas === 1 ? 'granja' : 'granjas'} · {propietario.granjasActivas} activas
                </span>
                <IcChevronRight size={14} className="admin-control-flecha" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!cargando && propietariosSinGranja > 0 && (
        <button type="button" className="admin-control-aviso" onClick={onGestionar}>
          {propietariosSinGranja} {propietariosSinGranja === 1 ? 'propietario aún no tiene granja asignada' : 'propietarios aún no tienen granja asignada'}
          <IcChevronRight size={14} />
        </button>
      )}
    </section>
  )
}

export default ControlGranjas
