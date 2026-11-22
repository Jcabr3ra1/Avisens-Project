import { lazy, Suspense } from 'react'
import type { Lote } from '@features/lotes/api/lotes'
import type { DashboardIndicador } from '@features/dashboard/model/dashboard'
import { resumenAccesible } from '@features/guia-crecimiento/model/proyeccion'
import { IcArrowRight, IcEgg } from '@shared/ui/icons/icons'
import { formatearFechaCalendario } from '@shared/utils/fechas'
import type { GalponConLotes } from '../../hooks/useEstructuraGranjas'
import { faltantesLote, textoFaltantes } from '../../model/datosDescriptivos'
import { avesActuales, diasDeVida } from '../../model/estructura'
import { lotesActivosDeGalpon } from '../explorador'
import type { useCurvaLote } from '../useCurvaLote'

const GraficoCrecimiento = lazy(() => import('@shared/ui/graficos/GraficoCrecimiento'))

type Props = {
  galpon: GalponConLotes
  loteSeleccionado: Lote | null
  indicadoresPorLote: Map<number, DashboardIndicador | null>
  consumoPorLote: Map<number, { alimentoKg: number; aguaLitros: number }>
  curvaLote: ReturnType<typeof useCurvaLote>
  onSeleccionarLote: (loteId: number) => void
  onEditarDatos: (lote: Lote) => void
  onNavegar: (ruta: string) => void
}

const decimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })
const entero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
const capitalizar = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1)

const ESTADOS: Record<string, string> = {
  activo: 'En curso',
  finalizado: 'Finalizado',
  inactivo: 'Inactivo',
}

function CurvaMini({ lote, estado, onNavegar }: {
  lote: Lote
  estado: ReturnType<typeof useCurvaLote>
  onNavegar: (ruta: string) => void
}) {
  const { curva, problema, cargando } = estado
  if (cargando) return <div className="gp-curva-vacia" role="status">Calculando la curva del lote…</div>
  if (problema) {
    return (
      <div className="gp-curva-vacia">
        {problema.tipo === 'sin_pesajes'
          ? 'Con el primer pesaje aquí verás hacia dónde va el lote.'
          : problema.mensaje}
        {problema.tipo === 'error' && /bit[aá]cora/i.test(problema.mensaje) && (
          <button
            type="button"
            className="adm-btn adm-btn--primario"
            onClick={() => onNavegar(`/bitacora?lote=${lote.id}&vista=peso`)}
          >
            Corregir en la Bitácora
          </button>
        )}
      </div>
    )
  }
  if (!curva) return null
  const referencia = curva.referencias.genetica?.linea ?? null
  return (
    <Suspense fallback={<div className="gp-curva-vacia" role="status">Cargando gráfico…</div>}>
      <GraficoCrecimiento
        serie={curva.serie}
        diaActual={curva.dia_actual}
        pesoObjetivoG={curva.peso_objetivo_g}
        etiquetaEstandar={referencia}
        etiquetaMarca={null}
        descripcion={resumenAccesible(curva, referencia)}
        altura={260}
      />
    </Suspense>
  )
}

function LotesPestana({
  galpon,
  loteSeleccionado,
  indicadoresPorLote,
  consumoPorLote,
  curvaLote,
  onSeleccionarLote,
  onEditarDatos,
  onNavegar,
}: Props) {
  const activos = lotesActivosDeGalpon(galpon)
  const lote = loteSeleccionado ?? activos[0] ?? null
  const activosIds = new Set(activos.map((item) => item.id))
  const historial = galpon.lotes.filter((item) => !activosIds.has(item.id))

  const indicador = lote ? indicadoresPorLote.get(lote.id) ?? null : null
  const consumo = lote ? consumoPorLote.get(lote.id) : undefined
  const vivas = lote ? avesActuales(lote.cantidad_inicial, indicador?.mortalidadAcumuladaPct ?? null) : 0
  const faltantes = lote ? faltantesLote(lote) : []

  return (
    <div className="gp-resumen">
      {activos.length > 1 && (
        <section className="gp-lotes-selector" aria-label="Lotes activos en este galpón">
          <div className="gp-lotes-selector-cabecera">
            <span className="gp-rotulo">Lotes activos en este galpón</span>
            <span className="gp-conteo">{activos.length} en curso</span>
          </div>
          <div className="gp-lotes-pills" role="tablist" aria-label="Seleccionar lote activo">
            {activos.map((item) => {
              const ind = indicadoresPorLote.get(item.id) ?? null
              const vivasItem = avesActuales(item.cantidad_inicial, ind?.mortalidadAcumuladaPct ?? null)
              const esActivo = lote?.id === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={esActivo}
                  className={`gp-lote-pill${esActivo ? ' is-activa' : ''}`}
                  onClick={() => onSeleccionarLote(item.id)}
                >
                  <span className="gp-lote-pill-codigo">{item.codigo}</span>
                  <span className="gp-lote-pill-meta">
                    Día {diasDeVida(item.fecha_ingreso)} · {entero.format(vivasItem)} aves
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {!lote ? (
        <div className="gp-card gp-curva-vacia">
          <IcEgg size={20} aria-hidden="true" />
          Este galpón no tiene lotes en curso.
        </div>
      ) : (
        <>
          <section className="gp-card gp-lote-card" aria-labelledby="gp-lote-titulo">
            <header className="gp-lote-top">
              <div>
                <span className="gp-rotulo">
                  {activos.length > 1
                    ? `Lote en curso (${activos.findIndex((item) => item.id === lote.id) + 1} de ${activos.length})`
                    : 'Lote en curso'}
                </span>
                <div className="gp-lote-titulo-fila">
                  <h3 id="gp-lote-titulo">{lote.codigo}</h3>
                  <span className="gp-lote-dia">Día {diasDeVida(lote.fecha_ingreso)}</span>
                </div>
                <p className="gp-lote-sub">
                  Ingresó el {formatearFechaCalendario(lote.fecha_ingreso)}
                </p>
              </div>

              {faltantes.length > 0 && (
                <button
                  type="button"
                  className="adm-btn adm-btn--primario"
                  onClick={() => onEditarDatos(lote)}
                >
                  Completar datos del lote
                </button>
              )}
            </header>

            <dl className="gp-lote-kpis">
              <div>
                <dt>Aves vivas</dt>
                <dd>{entero.format(vivas)}</dd>
                <span className="gp-lote-kpi-sub">de {entero.format(lote.cantidad_inicial)} ingresadas</span>
              </div>
              <div>
                <dt>Mortalidad</dt>
                <dd>
                  {indicador?.mortalidadAcumuladaPct != null
                    ? `${decimal.format(indicador.mortalidadAcumuladaPct)} %`
                    : '—'}
                </dd>
                <span className="gp-lote-kpi-sub">Acumulada del lote</span>
              </div>
              <div>
                <dt>Peso promedio</dt>
                <dd>
                  {indicador?.pesoPromedioG != null
                    ? `${entero.format(indicador.pesoPromedioG)} g`
                    : '—'}
                </dd>
                <span className="gp-lote-kpi-sub">Último pesaje registrado</span>
              </div>
              <div>
                <dt>Conversión (FCR)</dt>
                <dd>{indicador?.fcr != null ? indicador.fcr.toFixed(2) : '—'}</dd>
                <span className="gp-lote-kpi-sub">Relación alimento / peso</span>
              </div>
              <div>
                <dt>Alimento</dt>
                <dd>{consumo && consumo.alimentoKg > 0 ? `${decimal.format(consumo.alimentoKg)} kg` : '—'}</dd>
                <span className="gp-lote-kpi-sub">Consumo acumulado</span>
              </div>
              <div>
                <dt>Agua</dt>
                <dd>{consumo && consumo.aguaLitros > 0 ? `${decimal.format(consumo.aguaLitros)} L` : '—'}</dd>
                <span className="gp-lote-kpi-sub">Consumo acumulado</span>
              </div>
            </dl>

            <div className="gp-lote-meta">
              <div>
                <span>Línea genética</span>
                <strong>{lote.linea_genetica?.nombre ?? 'Sin definir'}</strong>
              </div>
              <div>
                <span>Sexo</span>
                <strong>{lote.sexo ? capitalizar(lote.sexo) : 'Sin definir'}</strong>
              </div>
              <div>
                <span>Marca de alimento</span>
                <strong>{lote.marca_alimento ? capitalizar(lote.marca_alimento) : 'Sin definir'}</strong>
              </div>
            </div>

            {faltantes.length > 0 && (
              <div className="gp-lote-pendiente" role="note">
                <span>Pendiente: {textoFaltantes(faltantes)}.</span>
              </div>
            )}
          </section>

          <section className="gp-card gp-bloque" aria-labelledby="gp-curva-titulo">
            <div className="gp-bloque-cabecera">
              <div>
                <span className="gp-rotulo">Crecimiento del lote</span>
                <h3 id="gp-curva-titulo">Peso real frente al estándar</h3>
              </div>
              <button
                type="button"
                className="adm-btn adm-btn--secundario"
                onClick={() => onNavegar(`/guia-crecimiento?lote=${lote.id}`)}
              >
                Abrir guía de peso <IcArrowRight size={14} aria-hidden="true" />
              </button>
            </div>
            <CurvaMini lote={lote} estado={curvaLote} onNavegar={onNavegar} />
          </section>
        </>
      )}

      {historial.length > 0 && (
        <section className="gp-card gp-bloque" aria-labelledby="gp-historial-titulo">
          <div className="gp-bloque-cabecera">
            <div>
              <span className="gp-rotulo">Histórico</span>
              <h3 id="gp-historial-titulo">Lotes anteriores</h3>
            </div>
            <span className="gp-conteo">{historial.length}</span>
          </div>
          <div className="gp-historial-wrap">
            <table className="gp-historial-tabla">
              <thead>
                <tr>
                  <th scope="col">Lote</th>
                  <th scope="col">Ingreso</th>
                  <th scope="col">Aves iniciales</th>
                  <th scope="col">Estado</th>
                  <th scope="col"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {historial.map((item) => (
                  <tr key={item.id}>
                    <td><code>{item.codigo}</code></td>
                    <td>{formatearFechaCalendario(item.fecha_ingreso)}</td>
                    <td>{entero.format(item.cantidad_inicial)} aves</td>
                    <td>
                      <span className="gp-historial-estado">
                        {ESTADOS[item.estado] ?? item.estado}
                      </span>
                    </td>
                    <td className="gp-historial-accion">
                      <button
                        type="button"
                        className="gp-historial-enlace"
                        onClick={() => onNavegar(`/guia-crecimiento?lote=${item.id}`)}
                      >
                        Ver guía <IcArrowRight size={13} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

export default LotesPestana
