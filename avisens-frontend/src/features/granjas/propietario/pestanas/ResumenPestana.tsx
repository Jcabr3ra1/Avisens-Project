import type { DashboardIndicador } from '@features/dashboard/model/dashboard'
import {
  IcAlert,
  IcArrowRight,
  IcCheck,
  IcDoc,
  IcEgg,
  IcScale,
  IcThermo,
} from '@shared/ui/icons/icons'
import { formatearFechaCalendario } from '@shared/utils/fechas'
import type { GalponConLotes } from '../../hooks/useEstructuraGranjas'
import { avesActuales, diasDeVida } from '../../model/estructura'
import {
  lotesActivosDeGalpon,
  type DestinoPaso,
  type ProximoPaso,
  type TarjetaGalpon,
} from '../explorador'
import { MapaTermicoGalpon } from './ambiente/MapaTermicoGalpon'

type Props = {
  galpon: GalponConLotes
  tarjeta: TarjetaGalpon
  sensores: { reportando: number; total: number }
  indicadoresPorLote: Map<number, DashboardIndicador | null>
  paso: ProximoPaso
  onAbrirLote: (loteId?: number) => void
  onAbrirBitacora: (loteId?: number, vista?: 'resumen' | 'peso') => void
  onAbrirAmbiente: () => void
  onAbrirAlertas: () => void
  onDestino: (destino: DestinoPaso) => void
  onCambioEstructura?: () => void
}

const decimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })
const entero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
const DIAS_CICLO_REFERENCIA = 42

function estadoMortalidad(pct: number | null): { etiqueta: string; tono: 'ok' | 'atencion' | 'peligro' } | null {
  if (pct == null) return null
  if (pct >= 5) return { etiqueta: 'Mortalidad alta', tono: 'peligro' }
  if (pct >= 3) return { etiqueta: 'En vigilancia', tono: 'atencion' }
  return { etiqueta: 'Normal', tono: 'ok' }
}

function ResumenPestana({
  galpon,
  tarjeta,
  sensores,
  indicadoresPorLote,
  paso,
  onAbrirLote,
  onAbrirBitacora,
  onAbrirAmbiente,
  onAbrirAlertas,
  onDestino,
  onCambioEstructura,
}: Props) {
  const activos = lotesActivosDeGalpon(galpon)
  const pasoEsAccionPendiente = paso.tono === 'alerta' || paso.tono === 'atencion'

  const vivasTotal = activos.reduce((acc, item) => {
    const ind = indicadoresPorLote.get(item.id) ?? null
    return acc + avesActuales(item.cantidad_inicial, ind?.mortalidadAcumuladaPct ?? null)
  }, 0)

  const lotePrincipal = activos[0] ?? null
  const hayAlertas = galpon.alertasAbiertas > 0
  const ambienteDetalle = [
    tarjeta.humedad ? `${tarjeta.humedad} HR` : null,
    sensores.total > 0 ? `${sensores.reportando}/${sensores.total} sensores` : 'Sin sensores',
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="gp-resumen">
      {pasoEsAccionPendiente ? (
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
      ) : (
        <div className={`gp-estado-linea gp-estado-linea--${paso.tono}`} role="status">
          <span className="gp-estado-linea-icono" aria-hidden="true">
            {paso.tono === 'ok' ? <IcCheck size={14} /> : <IcEgg size={14} />}
          </span>
          <div className="gp-estado-linea-texto">
            <strong>{paso.titulo}</strong>
            <span>{paso.detalle}</span>
          </div>
          {paso.accion && (
            <button
              type="button"
              className="gp-estado-linea-accion"
              onClick={() => onDestino(paso.destino)}
            >
              {paso.accion} <IcArrowRight size={13} aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {/* ── Pulso operativo navegable (4 tarjetas KPI unificadas) ── */}
      <section className="adm-kpis" aria-label="Pulso operativo del galpón">
        <button
          type="button"
          className="adm-kpi adm-kpi--primario"
          onClick={() => onAbrirLote(lotePrincipal?.id)}
        >
          <span className="adm-kpi-cab">
            <span className="adm-kpi-etiqueta">Población activa</span>
            <span className="adm-kpi-icono" aria-hidden="true">
              <IcEgg size={15} />
            </span>
          </span>
          <strong className="adm-kpi-valor">
            {activos.length > 0 ? entero.format(vivasTotal) : '0'}
          </strong>
          <span className="adm-kpi-nota">
            {activos.length === 0
              ? 'Sin lotes en curso'
              : `${activos.length} ${activos.length === 1 ? 'lote' : 'lotes'}${tarjeta.ocupacion !== null ? ` · ${Math.round(tarjeta.ocupacion)}% ocupación` : ''}`}
          </span>
        </button>

        <button
          type="button"
          className="adm-kpi adm-kpi--info"
          onClick={onAbrirAmbiente}
        >
          <span className="adm-kpi-cab">
            <span className="adm-kpi-etiqueta">Ambiente</span>
            <span className="adm-kpi-icono" aria-hidden="true">
              <IcThermo size={15} />
            </span>
          </span>
          <strong className="adm-kpi-valor">
            {tarjeta.temperatura ?? '—'}
          </strong>
          <span className="adm-kpi-nota">{ambienteDetalle}</span>
        </button>

        <button
          type="button"
          className={`adm-kpi adm-kpi--${hayAlertas ? 'peligro' : 'ok'}`}
          onClick={onAbrirAlertas}
        >
          <span className="adm-kpi-cab">
            <span className="adm-kpi-etiqueta">Alertas</span>
            <span className="adm-kpi-icono" aria-hidden="true">
              {hayAlertas ? <IcAlert size={15} /> : <IcCheck size={15} />}
            </span>
          </span>
          <strong className="adm-kpi-valor">
            {galpon.alertasAbiertas}
          </strong>
          <span className="adm-kpi-nota">
            {hayAlertas
              ? galpon.alertasAbiertas === 1
                ? '1 alerta abierta por revisar'
                : `${galpon.alertasAbiertas} alertas abiertas`
              : 'Sin alertas abiertas'}
          </span>
        </button>

        <button
          type="button"
          className="adm-kpi adm-kpi--primario"
          onClick={() => onAbrirBitacora(lotePrincipal?.id, lotePrincipal ? 'peso' : 'resumen')}
          disabled={!lotePrincipal}
        >
          <span className="adm-kpi-cab">
            <span className="adm-kpi-etiqueta">Acción rápida</span>
            <span className="adm-kpi-icono" aria-hidden="true">
              <IcScale size={15} />
            </span>
          </span>
          <strong className="adm-kpi-valor adm-kpi-valor--texto is-tono">
            {lotePrincipal ? 'Registrar pesaje' : 'Sin lote activo'}
          </strong>
          <span className="adm-kpi-nota">
            {lotePrincipal
              ? `${lotePrincipal.codigo} · Día ${diasDeVida(lotePrincipal.fecha_ingreso)}`
              : 'Disponible al iniciar un lote'}
          </span>
        </button>
      </section>

      {/* ── Producción activa (lotes en curso con progreso y accesos directos) ── */}
      <section className="gp-card gp-bloque" aria-labelledby="gp-resumen-lotes-titulo">
        <div className="gp-bloque-cabecera">
          <div>
            <span className="gp-rotulo">Producción activa</span>
            <div className="gp-resumen-titulo-fila">
              <h3 id="gp-resumen-lotes-titulo">
                {activos.length > 1 ? 'Lotes en curso en este galpón' : 'Lote en curso'}
              </h3>
              {activos.length > 0 && (
                <span className="gp-conteo">{activos.length}</span>
              )}
            </div>
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
              const dias = diasDeVida(item.fecha_ingreso)
              const progresoCiclo = Math.min(100, Math.max(4, Math.round((dias / DIAS_CICLO_REFERENCIA) * 100)))
              const saludMort = estadoMortalidad(ind?.mortalidadAcumuladaPct ?? null)

              return (
                <li key={item.id} className="gp-resumen-lote-card">
                  <div className="gp-resumen-lote-cab">
                    <div className="gp-resumen-lote-info">
                      <div className="gp-resumen-lote-top">
                        <strong>{item.codigo}</strong>
                        <span className="gp-lote-dia">Día {dias}</span>
                        {saludMort && (
                          <span className={`gp-lote-salud gp-lote-salud--${saludMort.tono}`}>
                            {saludMort.etiqueta}
                          </span>
                        )}
                      </div>
                      <span className="gp-resumen-lote-sub">
                        Ingreso {formatearFechaCalendario(item.fecha_ingreso)}
                        {item.linea_genetica?.nombre ? ` · ${item.linea_genetica.nombre}` : ''}
                      </span>
                    </div>

                    <div className="gp-resumen-lote-acciones">
                      <button
                        type="button"
                        className="gp-resumen-lote-btn"
                        onClick={() => onAbrirBitacora(item.id)}
                      >
                        <IcDoc size={14} aria-hidden="true" />
                        Bitácora
                      </button>
                      <button
                        type="button"
                        className="gp-resumen-lote-ver"
                        onClick={() => onAbrirLote(item.id)}
                      >
                        Ver lote <IcArrowRight size={14} aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <div className="gp-resumen-lote-cuerpo">
                    <dl className="gp-resumen-lote-datos">
                      <div>
                        <dt>Aves vivas</dt>
                        <dd>{entero.format(vivas)}</dd>
                      </div>
                      <div>
                        <dt>Peso promedio</dt>
                        <dd>{ind?.pesoPromedioG != null ? `${entero.format(ind.pesoPromedioG)} g` : 'Sin pesaje'}</dd>
                      </div>
                      <div>
                        <dt>Mortalidad</dt>
                        <dd className={saludMort && saludMort.tono !== 'ok' ? `is-${saludMort.tono}` : undefined}>
                          {ind?.mortalidadAcumuladaPct != null ? `${decimal.format(ind.mortalidadAcumuladaPct)} %` : '0 %'}
                        </dd>
                      </div>
                    </dl>

                    <div className="gp-resumen-ciclo" aria-label={`Avance del ciclo: día ${dias} de ${DIAS_CICLO_REFERENCIA}`}>
                      <div className="gp-resumen-ciclo-cab">
                        <span>Avance del ciclo</span>
                        <strong>Día {dias} / {DIAS_CICLO_REFERENCIA}</strong>
                      </div>
                      <div className="gp-resumen-ciclo-barra" aria-hidden="true">
                        <span style={{ width: `${progresoCiclo}%` }} />
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* ── Mapa térmico 3D del galpón ── */}
      <section className="gp-resumen-mapa-seccion" aria-labelledby="gp-resumen-mapa-titulo">
        <div className="gp-resumen-mapa-cab">
          <div>
            <span className="gp-rotulo">Vista ambiental</span>
            <h3 id="gp-resumen-mapa-titulo">Mapa térmico del galpón</h3>
          </div>
          <button
            type="button"
            className="adm-btn adm-btn--secundario"
            onClick={onAbrirAmbiente}
          >
            Sensores y control <IcArrowRight size={14} aria-hidden="true" />
          </button>
        </div>
        <MapaTermicoGalpon
          key={galpon.id}
          galpon={galpon}
          onIrABitacora={(loteId) => onAbrirBitacora(loteId)}
          onGuardado={onCambioEstructura}
        />
      </section>
    </div>
  )
}

export default ResumenPestana
