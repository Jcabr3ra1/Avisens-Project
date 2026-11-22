import type { DashboardIndicador } from '@features/dashboard/model/dashboard'
import { IcAlert, IcArrowRight, IcCheck, IcEgg } from '@shared/ui/icons/icons'
import { formatearFechaCalendario } from '@shared/utils/fechas'
import type { GalponConLotes } from '../../hooks/useEstructuraGranjas'
import { avesActuales, diasDeVida } from '../../model/estructura'
import { lotesActivosDeGalpon, type DestinoPaso, type ProximoPaso } from '../explorador'
import { MapaTermicoGalpon } from './ambiente/MapaTermicoGalpon'

type Props = {
  galpon: GalponConLotes
  indicadoresPorLote: Map<number, DashboardIndicador | null>
  paso: ProximoPaso
  onAbrirLote: (loteId?: number) => void
  onDestino: (destino: DestinoPaso) => void
  onNavegar: (ruta: string) => void
  onCambioEstructura?: () => void
}

const decimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })
const entero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })

function ResumenPestana({
  galpon,
  indicadoresPorLote,
  paso,
  onAbrirLote,
  onDestino,
  onNavegar,
  onCambioEstructura,
}: Props) {
  const activos = lotesActivosDeGalpon(galpon)
  const pasoEsAccionPendiente = paso.tono === 'alerta' || paso.tono === 'atencion'

  return (
    <div className="gp-resumen">
      {pasoEsAccionPendiente && (
        <section className={`gp-paso gp-paso--${paso.tono}`} aria-labelledby="gp-paso-titulo">
          <span className="gp-paso-icono" aria-hidden="true">
            <IcAlert size={18} />
          </span>
          <div className="gp-paso-texto">
            <span className="gp-paso-rotulo">Requiere atención</span>
            <strong id="gp-paso-titulo">{paso.titulo}</strong>
            <span>{paso.detalle}</span>
          </div>
          {paso.accion && (
            <button type="button" className="adm-btn adm-btn--primario" onClick={() => onDestino(paso.destino)}>
              {paso.accion} <IcArrowRight size={14} aria-hidden="true" />
            </button>
          )}
        </section>
      )}

      <MapaTermicoGalpon
        key={galpon.id}
        galpon={galpon}
        onIrABitacora={() => onNavegar('/bitacora')}
        onGuardado={onCambioEstructura}
      />

      {!pasoEsAccionPendiente && (
        <div className={`gp-estado-linea gp-estado-linea--${paso.tono}`} role="status">
          <span className="gp-estado-linea-icono" aria-hidden="true">
            {paso.tono === 'ok' ? <IcCheck size={14} /> : <IcEgg size={14} />}
          </span>
          <strong>{paso.titulo}</strong>
          <span>{paso.detalle}</span>
        </div>
      )}

      <section className="gp-card gp-bloque" aria-labelledby="gp-resumen-lotes-titulo">
        <div className="gp-bloque-cabecera">
          <div>
            <span className="gp-rotulo">Producción activa</span>
            <h3 id="gp-resumen-lotes-titulo">
              {activos.length > 1 ? 'Lotes en curso en este galpón' : 'Lote en curso'}
            </h3>
          </div>
          {activos.length > 0 && (
            <button
              type="button"
              className="adm-btn adm-btn--secundario"
              onClick={() => onAbrirLote(activos[0].id)}
            >
              Ir a Lotes <IcArrowRight size={14} aria-hidden="true" />
            </button>
          )}
        </div>

        {activos.length === 0 ? (
          <div className="gp-curva-vacia">
            <IcEgg size={20} aria-hidden="true" />
            Este galpón no tiene lotes en curso.
          </div>
        ) : (
          <ul className="gp-resumen-lotes-lista">
            {activos.map((item) => {
              const ind = indicadoresPorLote.get(item.id) ?? null
              const vivas = avesActuales(item.cantidad_inicial, ind?.mortalidadAcumuladaPct ?? null)
              return (
                <li key={item.id} className="gp-resumen-lote-fila">
                  <div className="gp-resumen-lote-info">
                    <div className="gp-resumen-lote-top">
                      <strong>{item.codigo}</strong>
                      <span className="gp-lote-dia">Día {diasDeVida(item.fecha_ingreso)}</span>
                    </div>
                    <span className="gp-resumen-lote-sub">
                      Ingresó el {formatearFechaCalendario(item.fecha_ingreso)}
                      {item.linea_genetica?.nombre ? ` · ${item.linea_genetica.nombre}` : ''}
                    </span>
                  </div>

                  <dl className="gp-resumen-lote-datos">
                    <div>
                      <dt>Aves</dt>
                      <dd>{entero.format(vivas)}</dd>
                    </div>
                    <div>
                      <dt>Peso</dt>
                      <dd>{ind?.pesoPromedioG != null ? `${entero.format(ind.pesoPromedioG)} g` : '—'}</dd>
                    </div>
                    <div>
                      <dt>Mortalidad</dt>
                      <dd>{ind?.mortalidadAcumuladaPct != null ? `${decimal.format(ind.mortalidadAcumuladaPct)} %` : '—'}</dd>
                    </div>
                  </dl>

                  <button
                    type="button"
                    className="gp-resumen-lote-ver"
                    onClick={() => onAbrirLote(item.id)}
                  >
                    Ver lote <IcArrowRight size={14} aria-hidden="true" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

export default ResumenPestana
