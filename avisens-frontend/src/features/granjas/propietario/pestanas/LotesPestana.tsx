import { lazy, Suspense } from 'react'
import type { Lote } from '@features/lotes/api/lotes'
import type { DashboardIndicador } from '@features/dashboard/model/dashboard'
import { resumenAccesible } from '@features/guia-crecimiento/model/proyeccion'
import { IcAlert, IcArrowRight, IcChart, IcDrop, IcEgg, IcScale, IcSeed } from '@shared/ui/icons/icons'
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

            <div className="adm-kpis adm-kpis--3" aria-label="Indicadores del lote">
              <article className="adm-kpi adm-kpi--primario">
                <span className="adm-kpi-cab">
                  <span className="adm-kpi-etiqueta">Aves vivas</span>
                  <span className="adm-kpi-icono" aria-hidden="true"><IcEgg size={15} /></span>
                </span>
                <strong className="adm-kpi-valor">{entero.format(vivas)}</strong>
                <span className="adm-kpi-nota">de {entero.format(lote.cantidad_inicial)} ingresadas</span>
              </article>
              <article className={`adm-kpi adm-kpi--${indicador?.mortalidadAcumuladaPct != null && indicador.mortalidadAcumuladaPct >= 4 ? 'peligro' : 'ok'}`}>
                <span className="adm-kpi-cab">
                  <span className="adm-kpi-etiqueta">Mortalidad</span>
                  <span className="adm-kpi-icono" aria-hidden="true"><IcAlert size={15} /></span>
                </span>
                <strong className="adm-kpi-valor">
                  {indicador?.mortalidadAcumuladaPct != null
                    ? `${decimal.format(indicador.mortalidadAcumuladaPct)} %`
                    : '—'}
                </strong>
                <span className="adm-kpi-nota">Acumulada del lote</span>
              </article>
              <article className="adm-kpi adm-kpi--primario">
                <span className="adm-kpi-cab">
                  <span className="adm-kpi-etiqueta">Peso promedio</span>
                  <span className="adm-kpi-icono" aria-hidden="true"><IcScale size={15} /></span>
                </span>
                <strong className="adm-kpi-valor">
                  {indicador?.pesoPromedioG != null
                    ? `${entero.format(indicador.pesoPromedioG)} g`
                    : '—'}
                </strong>
                <span className="adm-kpi-nota">Último pesaje registrado</span>
              </article>
              <article className="adm-kpi adm-kpi--info">
                <span className="adm-kpi-cab">
                  <span className="adm-kpi-etiqueta">Conversión (FCR)</span>
                  <span className="adm-kpi-icono" aria-hidden="true"><IcChart size={15} /></span>
                </span>
                <strong className="adm-kpi-valor">{indicador?.fcr != null ? indicador.fcr.toFixed(2) : '—'}</strong>
                <span className="adm-kpi-nota">Relación alimento / peso</span>
              </article>
              <article className="adm-kpi adm-kpi--ok">
                <span className="adm-kpi-cab">
                  <span className="adm-kpi-etiqueta">Alimento</span>
                  <span className="adm-kpi-icono" aria-hidden="true"><IcSeed size={15} /></span>
                </span>
                <strong className="adm-kpi-valor">{consumo && consumo.alimentoKg > 0 ? `${decimal.format(consumo.alimentoKg)} kg` : '—'}</strong>
                <span className="adm-kpi-nota">Consumo acumulado</span>
              </article>
              <article className="adm-kpi adm-kpi--info">
                <span className="adm-kpi-cab">
                  <span className="adm-kpi-etiqueta">Agua</span>
                  <span className="adm-kpi-icono" aria-hidden="true"><IcDrop size={15} /></span>
                </span>
                <strong className="adm-kpi-valor">{consumo && consumo.aguaLitros > 0 ? `${decimal.format(consumo.aguaLitros)} L` : '—'}</strong>
                <span className="adm-kpi-nota">Consumo acumulado</span>
              </article>
            </div>

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
