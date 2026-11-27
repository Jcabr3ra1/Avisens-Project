import { IcAlert, IcArrowRight, IcEgg, IcSeed } from '@shared/ui/icons/icons'
import type { JornadaOperario } from '../model/jornadaOperario'

type Props = {
  jornada: JornadaOperario
  destacado?: boolean
  onRegistrarMortalidad: () => void
  onRegistrarConsumo: () => void
  onVerCrecimiento: () => void
}

function TarjetaJornada({
  jornada,
  destacado = false,
  onRegistrarMortalidad,
  onRegistrarConsumo,
  onVerCrecimiento,
}: Props) {
  const { galpon, lote, lotesActivos, diaLote } = jornada
  const activos = lotesActivos.length > 0 ? lotesActivos : lote ? [lote] : []
  const avesTotal = activos.reduce((suma, item) => suma + item.cantidad_inicial, 0)

  return (
    <article className={`op-jornada-card${lote ? ' is-con-lote' : ''}${destacado ? ' is-destacada' : ''}`}>
      <header className="op-jornada-top">
        <div className="op-jornada-ident">
          <span className="op-jornada-granja">{galpon.granja.nombre}</span>
          <h3>{galpon.nombre}</h3>
        </div>
        <code className="op-jornada-codigo">{galpon.codigo}</code>
      </header>

      {lote ? (
        <div className="op-jornada-lote">
          <span className="op-jornada-lote-icono" aria-hidden="true">
            <IcEgg size={15} />
          </span>
          <div className="op-jornada-lote-texto">
            <strong>
              {activos.length > 1 ? `${activos.length} lotes activos` : lote.codigo}
            </strong>
            <span>
              {avesTotal.toLocaleString('es-CO')} aves
              {activos.length === 1 && diaLote !== null ? ` · Día ${diaLote}` : ''}
            </span>
          </div>
          <button
            type="button"
            className="op-jornada-guia"
            onClick={onVerCrecimiento}
          >
            Guía <IcArrowRight size={13} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <p className="op-jornada-vacio">Sin lote activo en este galpón.</p>
      )}

      <div className="op-jornada-acciones">
        <button
          type="button"
          className="adm-btn adm-btn--primario op-jornada-btn"
          onClick={onRegistrarConsumo}
          disabled={!lote}
        >
          <IcSeed size={15} aria-hidden="true" />
          Consumo
        </button>
        <button
          type="button"
          className="adm-btn adm-btn--secundario op-jornada-btn"
          onClick={onRegistrarMortalidad}
          disabled={!lote}
        >
          <IcAlert size={15} aria-hidden="true" />
          Mortalidad
        </button>
      </div>
    </article>
  )
}

export default TarjetaJornada
