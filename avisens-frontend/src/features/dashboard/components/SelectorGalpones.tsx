import { IcAlert, IcPlus } from '@shared/ui/icons/icons'
import { calcularDiaLote, type DashboardGalpon, type DashboardLote } from '../model/dashboard'

type ResumenAlertas = {
  total: number
  urgentes: number
}

interface Props {
  galpones: DashboardGalpon[]
  lotes: DashboardLote[]
  alertasPorGalpon: Record<number, ResumenAlertas>
  galponId: number | null
  busqueda: string
  onSeleccionar: (id: number) => void
  onAgregar?: () => void
}

function SelectorGalpones({
  galpones,
  lotes,
  alertasPorGalpon,
  galponId,
  busqueda,
  onSeleccionar,
  onAgregar,
}: Props) {
  const termino = busqueda.trim().toLocaleLowerCase('es-CO')
  const galponesVisibles = galpones.filter((galpon) => {
    if (!termino) return true
    const lote = lotes.find((item) => item.galponId === galpon.id && item.estado === 'activo')
    return [galpon.codigo, galpon.nombre, lote?.codigo]
      .filter(Boolean)
      .some((valor) => valor?.toLocaleLowerCase('es-CO').includes(termino))
  })

  return (
    <section className="dash-galpones" aria-labelledby="dash-galpones-titulo">
      <h2 id="dash-galpones-titulo" className="dash-galpones-titulo">
        Selecciona un galpón para revisar su estado
      </h2>

      <div className="dash-galpones-tira" role="group" aria-label="Galpones de la granja">
        {galponesVisibles.map((galpon) => {
          const lote =
            lotes.find((item) => item.galponId === galpon.id && item.estado === 'activo') ?? null
          const alertas = alertasPorGalpon[galpon.id] ?? { total: 0, urgentes: 0 }
          const seleccionado = galpon.id === galponId
          const estado = !lote
            ? 'vacio'
            : alertas.urgentes > 0
              ? 'urgente'
              : alertas.total > 0
                ? 'atencion'
                : 'correcto'

          return (
            <button
              key={galpon.id}
              type="button"
              className={`dash-galpon dash-galpon--${estado}${seleccionado ? ' es-activo' : ''}`}
              onClick={() => onSeleccionar(galpon.id)}
              aria-pressed={seleccionado}
            >
              <span className="dash-galpon-cabecera">
                <span className="dash-galpon-nombre">
                  <span className="dash-galpon-punto" aria-hidden="true" />
                  {galpon.nombre}
                </span>
                <span className="dash-galpon-codigo mono">{galpon.codigo}</span>
              </span>

              <span className="dash-galpon-info">
                <span className="dash-galpon-detalle">
                  {/* `cantidadInicial` son las aves alojadas al ingreso, no las
                      vivas hoy: se nombra así para no exagerar el inventario. */}
                  {lote
                    ? `${lote.cantidadInicial.toLocaleString('es-CO')} alojadas · día ${calcularDiaLote(lote.fechaIngreso)}`
                    : 'Sin lote · disponible'}
                </span>
                {alertas.total > 0 && (
                  <span className="dash-galpon-badge">
                    <IcAlert size={10} aria-hidden="true" /> {alertas.total}
                  </span>
                )}
              </span>
            </button>
          )
        })}

        {onAgregar && (
          <button
            type="button"
            className="dash-galpon-agregar"
            onClick={onAgregar}
            title="Registrar galpón"
            aria-label="Registrar galpón"
          >
            <IcPlus size={18} />
          </button>
        )}

        {galponesVisibles.length === 0 && (
          <p className="dash-galpones-vacio">
            No encontramos un galpón o lote con «{busqueda.trim()}».
          </p>
        )}
      </div>
    </section>
  )
}

export default SelectorGalpones
