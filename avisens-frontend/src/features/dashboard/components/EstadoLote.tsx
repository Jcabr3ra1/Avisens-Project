import type { ComparacionIndicador } from '@features/indicadores/api/indicadores'
import { IcChevronRight } from '@shared/ui/icons/icons'
import type { DashboardIndicador, DashboardLote } from '../model/dashboard'
import { lineaSparkline, textoComparacion, type Fila } from '../model/estadoLote'

type Props = {
  lote: DashboardLote | null
  indicadores: DashboardIndicador[]
  comparacion: ComparacionIndicador | null
  diaLote: number | null
  cargando: boolean
  onAbrirBitacora: () => void
}

function EstadoLote({ lote, indicadores, comparacion, diaLote, cargando, onAbrirBitacora }: Props) {
  const reciente = indicadores[0] ?? null

  const filas: Fila[] = [
    { etiqueta: 'Edad', valor: diaLote === null ? '—' : `${diaLote} días`, mono: true },
    { etiqueta: 'Aves alojadas', valor: lote ? lote.cantidadInicial.toLocaleString('es-CO') : '—', mono: true },
    {
      etiqueta: 'Mortalidad',
      valor: reciente?.mortalidadAcumuladaPct === null || reciente === null
        ? '—'
        : `${reciente.mortalidadAcumuladaPct} %`,
      alerta: (reciente?.mortalidadAcumuladaPct ?? 0) >= 2,
      mono: true,
    },
    {
      etiqueta: 'Peso promedio',
      valor: reciente?.pesoPromedioG == null ? '—' : `${reciente.pesoPromedioG} g`,
      nota: textoComparacion(comparacion?.desvio_peso_pct ?? null, comparacion?.peso_objetivo ?? null, 'g'),
      mono: true,
    },
    {
      etiqueta: 'Conversión',
      valor: reciente?.fcr == null ? '—' : String(reciente.fcr),
      nota: textoComparacion(comparacion?.desvio_fcr_pct ?? null, comparacion?.fcr_objetivo ?? null, ''),
      mono: true,
    },
    { etiqueta: 'Lote', valor: lote?.codigo ?? '—', mono: true },
  ]

  // La serie va del indicador más antiguo al más reciente: el sparkline se
  // lee de izquierda a derecha, igual que la gráfica de mediciones.
  const seriePeso = [...indicadores]
    .reverse()
    .map((indicador) => indicador.pesoPromedioG)
    .filter((peso): peso is number => peso !== null)

  return (
    <section className="dash-lote" aria-labelledby="dash-lote-titulo">
      <div className="dash-lote-cabecera">
        <h2 id="dash-lote-titulo">Estado del lote</h2>
        {lote && (
          <button type="button" className="dash-lote-enlace" onClick={onAbrirBitacora}>
            Bitácora <IcChevronRight size={13} />
          </button>
        )}
      </div>

      {cargando ? (
        <p className="dash-lote-mensaje" role="status">Cargando indicadores…</p>
      ) : !lote ? (
        <p className="dash-lote-mensaje">Este galpón no tiene un lote activo.</p>
      ) : (
        <>
          <dl className="dash-lote-filas">
            {filas.map((fila) => (
              <div key={fila.etiqueta} className="dash-lote-fila">
                <dt>{fila.etiqueta}</dt>
                <dd>
                  <span className={`${fila.mono ? 'mono ' : ''}${fila.alerta ? 'es-alerta' : ''}`}>
                    {fila.valor}
                  </span>
                  {fila.nota && <small>{fila.nota}</small>}
                </dd>
              </div>
            ))}
          </dl>

          {!reciente && (
            <p className="dash-lote-mensaje">
              Aún no hay indicadores calculados. Registra peso, mortalidad y consumo
              en la bitácora.
            </p>
          )}

          {seriePeso.length > 1 && (
            <div className="dash-lote-pie">
              <div className="dash-lote-pie-fila">
                <span>Peso promedio ({seriePeso.length} registros)</span>
                <span className="mono">{seriePeso[seriePeso.length - 1]} g</span>
              </div>
              <svg
                className="dash-lote-spark"
                viewBox="0 0 240 44"
                preserveAspectRatio="none"
                role="img"
                aria-label="Evolución del peso promedio"
              >
                <polyline points={lineaSparkline(seriePeso, 240, 44)} />
              </svg>
            </div>
          )}
        </>
      )}
    </section>
  )
}

export default EstadoLote
