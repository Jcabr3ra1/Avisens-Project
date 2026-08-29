import { IcAlert, IcEgg, IcHeart, IcLeaf, IcSeed } from '@shared/ui/icons/icons'
import type { JornadaOperario } from '../model/jornadaOperario'

type Props = {
  jornada: JornadaOperario
  onRegistrarMortalidad: () => void
  onRegistrarConsumo: () => void
  onVerAlertas: () => void
}

function TarjetaJornada({
  jornada,
  onRegistrarMortalidad,
  onRegistrarConsumo,
  onVerAlertas,
}: Props) {
  const { galpon, lote, diaLote } = jornada

  return (
    <article className="operario-galpon-card">
      <div className="operario-galpon-head">
        <span className="operario-galpon-icon"><IcLeaf size={20} /></span>
        <div>
          <p>{galpon.granja.nombre}</p>
          <h2>{galpon.nombre}</h2>
          <span>{galpon.codigo}</span>
        </div>
      </div>

      {lote ? (
        <div className="operario-lote-activo">
          <IcEgg size={18} />
          <div>
            <span>Lote activo · Día {diaLote}</span>
            <strong>{lote.codigo} · {lote.cantidad_inicial.toLocaleString()} aves</strong>
          </div>
        </div>
      ) : (
        <p className="operario-sin-lote">No hay un lote activo en este galpón.</p>
      )}

      <div className="operario-acciones">
        <button
          type="button"
          className="operario-btn operario-btn--mortalidad"
          onClick={onRegistrarMortalidad}
          disabled={!lote}
        >
          <IcHeart size={18} />
          Registrar mortalidad
        </button>
        <button
          type="button"
          className="operario-btn operario-btn--consumo"
          onClick={onRegistrarConsumo}
          disabled={!lote}
        >
          <IcSeed size={18} />
          Registrar consumo
        </button>
        <button type="button" className="operario-link-alertas" onClick={onVerAlertas}>
          <IcAlert size={16} />
          Ver mis alertas
        </button>
      </div>
    </article>
  )
}

export default TarjetaJornada
