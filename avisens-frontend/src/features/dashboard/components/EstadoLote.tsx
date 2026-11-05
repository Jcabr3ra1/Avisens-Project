import type { ComparacionIndicador } from '@features/indicadores/api/indicadores'
import { formatearPeso } from '@features/guia-crecimiento/model/proyeccion'
import { useCurvaLote } from '@features/granjas/propietario/useCurvaLote'
import type { DashboardIndicador, DashboardLote } from '../model/dashboard'
import { filaDeFaena } from '../model/faena'
import { comparacionVigente, esDatoVerificado, lineaSparkline, mismaRevision, pesoActualParaSparkline, serieDePesoVerificado, textoComparacion, textoComparacionFcr, textoFechaPesaje, type Fila } from '../model/estadoLote'

type Props = {
  lote: DashboardLote | null
  indicadores: DashboardIndicador[]
  comparacion: ComparacionIndicador | null
  diaLote: number | null
  cargando: boolean
}

function EstadoLote({ lote, indicadores, comparacion, diaLote, cargando }: Props) {
  const reciente = indicadores[0] ?? null
  const { curva } = useCurvaLote(lote?.id ?? null, 0)
  const datosVerificados = reciente !== null && esDatoVerificado(reciente.estadoCalculo)
  const notaVigente =
    datosVerificados &&
    comparacionVigente(comparacion?.fecha_del_dato_usado, reciente?.fecha) &&
    mismaRevision(comparacion?.revision_calculo, reciente?.revisionCalculo)
  // Fecha propia de "reciente" (misma peticion que su fcr), no la de
  // "comparacion" -- son dos llamadas HTTP independientes.
  const fechaFcr = datosVerificados ? textoFechaPesaje(reciente?.pesajeFechaSnapshot) : undefined

  const filas: Fila[] = [
    { etiqueta: 'Edad', valor: diaLote === null ? '—' : `${diaLote} días`, mono: true },
    { etiqueta: 'Aves alojadas', valor: lote ? lote.cantidadInicial.toLocaleString('es-CO') : '—', mono: true },
    {
      etiqueta: 'Mortalidad',
      valor: !datosVerificados || reciente?.mortalidadAcumuladaPct === null
        ? '—'
        : `${reciente.mortalidadAcumuladaPct} %`,
      alerta: datosVerificados && (reciente?.mortalidadAcumuladaPct ?? 0) >= 2,
      mono: true,
    },
    {
      etiqueta: 'Peso promedio',
      valor: !datosVerificados || reciente?.pesoPromedioG == null ? '—' : formatearPeso(reciente.pesoPromedioG),
      nota: notaVigente
        ? textoComparacion(comparacion?.desvio_peso_pct ?? null, comparacion?.objetivo?.peso_esperado_g ?? null, 'g')
        : undefined,
      mono: true,
    },
    {
      etiqueta: 'Conversión',
      valor:
        !datosVerificados || reciente?.fcr == null
          ? '—'
          : fechaFcr
            ? `${reciente.fcr} (${fechaFcr})`
            : String(reciente.fcr),
      nota: notaVigente
        ? textoComparacionFcr(comparacion?.desvio_fcr ?? null, comparacion?.objetivo?.fcr_objetivo ?? null)
        : undefined,
      mono: true,
    },
    { etiqueta: 'Lote', valor: lote?.codigo ?? '—', mono: true },
  ]
  const faena = filaDeFaena(curva)
  if (faena) filas.splice(filas.length - 1, 0, { ...faena, mono: true })

  // La serie va del indicador más antiguo al más reciente: el sparkline se
  // lee de izquierda a derecha, igual que la gráfica de mediciones.
  const seriePeso = serieDePesoVerificado([...indicadores].reverse())
  const pesoRecienteVerificado = pesoActualParaSparkline(reciente)

  return (
    <section className="rsm-lote" aria-labelledby="dash-lote-titulo">
      <header className="rsm-lote-cabecera">
        <div>
          <h2 id="dash-lote-titulo" className="rsm-titulo">Estado del lote</h2>
          {lote && <p className="rsm-subtitulo mono">{lote.codigo}</p>}
        </div>
      </header>

      {cargando ? (
        <p className="rsm-lote-mensaje" role="status">Cargando indicadores…</p>
      ) : !lote ? (
        <p className="rsm-lote-mensaje">Este galpón no tiene un lote activo.</p>
      ) : (
        <>
          <dl className="rsm-lote-datos">
            {filas.filter((fila) => fila.etiqueta !== 'Lote').map((fila) => (
              <div key={fila.etiqueta} className={`rsm-dato${fila.alerta ? ' es-alerta' : ''}`}>
                <dt>{fila.etiqueta}</dt>
                <dd className={fila.mono ? 'mono' : undefined}>{fila.valor}</dd>
                {fila.nota && <small>{fila.nota}</small>}
              </div>
            ))}
          </dl>

          {!reciente && (
            <p className="rsm-lote-mensaje">
              Aún no hay indicadores calculados. Registra peso, mortalidad y consumo
              en la bitácora.
            </p>
          )}

          {pesoRecienteVerificado !== null && seriePeso.length > 1 && (
            <div className="rsm-lote-peso">
              <div className="rsm-lote-peso-fila">
                <span>Peso promedio ({seriePeso.length} registros)</span>
                <span className="mono">{formatearPeso(pesoRecienteVerificado)}</span>
              </div>
              <svg
                className="rsm-lote-linea"
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
