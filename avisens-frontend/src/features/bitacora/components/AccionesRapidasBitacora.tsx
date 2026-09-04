import { IcDrop, IcHeart, IcScale, IcSeed } from '@shared/ui/icons/icons'
import type { TipoRegistro } from '../model/bitacora'

type Props = {
  codigoLote: string
  onRegistrar: (tipo: TipoRegistro) => void
  onRegistrarConsumo: () => void
}

function AccionesRapidasBitacora({ codigoLote, onRegistrar, onRegistrarConsumo }: Props) {
  return (
    <section className="bit-card bit-acciones-rapidas" aria-labelledby="bit-acciones-titulo">
      <header>
        <div>
          <p className="bit-kicker">Registro diario</p>
          <h2 id="bit-acciones-titulo">¿Qué deseas registrar?</h2>
          <p>Los datos se guardarán en el lote <strong>{codigoLote}</strong>.</p>
        </div>
      </header>
      <div className="bit-acciones">
        <button type="button" onClick={() => onRegistrar('peso')}>
          <IcScale size={21} aria-hidden="true" />
          <span>Registrar peso<small>Controlar el crecimiento</small></span>
        </button>
        <button type="button" onClick={() => onRegistrar('mortalidad')}>
          <IcHeart size={21} aria-hidden="true" />
          <span>Registrar mortalidad<small>Reportar aves fallecidas</small></span>
        </button>
        <button type="button" onClick={() => onRegistrar('sanitario')}>
          <IcDrop size={21} aria-hidden="true" />
          <span>Registrar sanidad<small>Vacunas, tratamientos o revisión</small></span>
        </button>
        <button type="button" onClick={onRegistrarConsumo}>
          <IcSeed size={21} aria-hidden="true" />
          <span>Registrar consumo<small>Alimento y agua diaria</small></span>
        </button>
      </div>
    </section>
  )
}

export default AccionesRapidasBitacora
