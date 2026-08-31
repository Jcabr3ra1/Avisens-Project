import { IcCheck, IcChevronRight, IcEgg, IcGrid, IcLeaf } from '@shared/ui/icons/icons'
import type { EtapaImplementacionGranja, EstadoImplementacionGranja } from '../model/granjaVista'

type Props = {
  etapas: EtapaImplementacionGranja[]
  cargando: boolean
  onAsignarGranja: (propietarioId: number) => void
  onAbrirGranja: (granjaId: number) => void
}

function iconoEtapa(id: EstadoImplementacionGranja) {
  const iconos = {
    sin_granja: IcLeaf,
    sin_galpon: IcGrid,
    sin_lote: IcEgg,
    operativa: IcCheck,
  }
  return iconos[id]
}

function TableroImplementacionGranjas({ etapas, cargando, onAsignarGranja, onAbrirGranja }: Props) {
  const totalPropietarios = etapas.reduce((total, etapa) => total + etapa.tarjetas.length, 0)

  return (
    <section className="grj-tablero" aria-labelledby="grj-tablero-titulo">
      <div className="grj-tablero-cabecera">
        <div>
          <p className="grj-tablero-kicker">Control de estructura productiva</p>
          <h2 id="grj-tablero-titulo">Estado de las granjas por propietario</h2>
          <p>El avance se calcula con las granjas, galpones y lotes registrados en Avisens.</p>
        </div>
      </div>

      {cargando ? (
        <p className="grj-tablero-vacio" role="status">Cargando estado de las granjas…</p>
      ) : totalPropietarios === 0 ? (
        <p className="grj-tablero-vacio">Aún no hay propietarios registrados.</p>
      ) : (
        <div className="grj-tablero-scroll">
          <div className="grj-tablero-columnas">
            {etapas.map((etapa) => {
              const Icono = iconoEtapa(etapa.id)
              return (
                <section key={etapa.id} className={`grj-tablero-columna grj-tablero-columna--${etapa.id}`} aria-label={etapa.titulo}>
                  <header className="grj-tablero-columna-cabecera">
                    <span className="grj-tablero-icono" aria-hidden="true"><Icono size={17} /></span>
                    <div>
                      <h3>{etapa.titulo}</h3>
                      <p>{etapa.descripcion}</p>
                    </div>
                    <span className="grj-tablero-contador">{etapa.tarjetas.length}</span>
                  </header>

                  <div className="grj-tablero-tarjetas">
                    {etapa.tarjetas.length === 0 ? (
                      <p className="grj-tablero-columna-vacia">Sin propietarios en esta etapa.</p>
                    ) : etapa.tarjetas.map((tarjeta) => (
                      <button
                        key={tarjeta.id}
                        type="button"
                        className="grj-tablero-tarjeta"
                        onClick={() => tarjeta.granjaId === null ? onAsignarGranja(tarjeta.id) : onAbrirGranja(tarjeta.granjaId)}
                        aria-label={`${tarjeta.nombre}. ${etapa.accion}.`}
                      >
                        <span className="grj-tablero-avatar" aria-hidden="true">{tarjeta.nombre.charAt(0).toUpperCase()}</span>
                        <span className="grj-tablero-tarjeta-contenido">
                          <strong>{tarjeta.nombre}</strong>
                          <span>{tarjeta.granjasActivas} granjas activas · {tarjeta.totalGalpones} galpones</span>
                          <span>{tarjeta.lotesActivos} lotes activos</span>
                        </span>
                        <IcChevronRight size={15} aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}

export default TableroImplementacionGranjas
