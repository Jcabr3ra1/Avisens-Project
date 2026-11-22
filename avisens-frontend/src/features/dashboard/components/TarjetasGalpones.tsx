import { IcArrowRight, IcCal, IcThermo } from '@shared/ui/icons/icons'
import type { TarjetaGalpon } from '../model/tarjetasGalpon'
import { IcPollo } from './IconosLote'

type Props = {
  tarjetas: TarjetaGalpon[]
  galponId: number | null
  onSeleccionar: (id: number) => void
  onAbrirGalpon?: (id: number) => void
}

const enteros = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })

function TarjetasGalpones({ tarjetas, galponId, onSeleccionar, onAbrirGalpon }: Props) {
  const uno = tarjetas.length === 1
  const galponPrincipalId = galponId ?? tarjetas[0]?.id ?? null

  return (
    <section className="rp-tarjeta rp-galpones-bloque" aria-labelledby="rp-galpones-titulo">
      <div className="rp-cab">
        <div>
          <h2 id="rp-galpones-titulo" className="rp-titulo">{uno ? 'Galpón en seguimiento' : 'Galpones'}</h2>
          {tarjetas.length > 1 && <p className="rp-cab-meta">Selecciona uno para ver su lote</p>}
        </div>
        {onAbrirGalpon && galponPrincipalId !== null && (
          <button
            type="button"
            className="rp-enlace-chip"
            onClick={() => onAbrirGalpon(galponPrincipalId)}
          >
            Abrir galpón
            <IcArrowRight size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      {tarjetas.length === 0 ? (
        <p className="rp-vacio">No hay galpones activos.</p>
      ) : (
        <ul className={uno ? 'rp-galpones rp-galpones--uno' : 'rp-galpones'}>
          {tarjetas.map((tarjeta) => {
            const elegido = tarjeta.id === galponId
            const temperatura = tarjeta.temperatura
            return (
              <li key={tarjeta.id}>
                <button
                  type="button"
                  className={`rp-galpon rp-tono-${tarjeta.tono}`}
                  aria-pressed={uno ? undefined : elegido}
                  onClick={() => (uno && onAbrirGalpon ? onAbrirGalpon(tarjeta.id) : onSeleccionar(tarjeta.id))}
                >
                  <span className="rp-galpon-cab">
                    <strong className="rp-galpon-nombre">{tarjeta.nombre}</strong>
                    <span className="rp-estado">
                      <span className="rp-punto" aria-hidden="true" />
                      {tarjeta.estado}
                    </span>
                  </span>

                  <span className="rp-galpon-datos">
                    <span className="rp-galpon-temp">
                      <IcThermo size={19} aria-hidden="true" className="rp-galpon-icono" />
                      {temperatura?.vigente ? (
                        <span className="rp-galpon-dato">
                          <span className="rp-galpon-valor">{temperatura.valorTexto}</span>
                          <span className={`rp-estado rp-tono-${temperatura.tono}`}>{temperatura.palabra}</span>
                        </span>
                      ) : (
                        <span className="rp-galpon-dato rp-galpon-dato--sin">
                          <span className="rp-galpon-sin">Sin lectura actual</span>
                          <span className="rp-meta">{temperatura ? temperatura.actualizado : 'Sin sensor de temperatura'}</span>
                        </span>
                      )}
                    </span>

                    {tarjeta.lote ? (
                      <>
                        <span className="rp-galpon-linea">
                          <IcCal size={17} aria-hidden="true" className="rp-galpon-icono" />
                          <span>
                            Día {tarjeta.lote.dia}
                            {tarjeta.lote.diaTotal !== null && <span className="rp-meta"> de {tarjeta.lote.diaTotal}</span>}
                          </span>
                        </span>
                        <span className="rp-galpon-linea">
                          <IcPollo size={17} aria-hidden="true" className="rp-galpon-icono" />
                          <span>
                            {enteros.format(tarjeta.lote.aves)} aves
                            <span className="rp-meta"> · {tarjeta.lote.codigo}</span>
                          </span>
                        </span>
                      </>
                    ) : (
                      <span className="rp-galpon-linea rp-meta">Sin lote en curso</span>
                    )}
                  </span>

                  {temperatura?.vigente && <span className="rp-meta rp-galpon-hora">{temperatura.actualizado}</span>}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default TarjetasGalpones
