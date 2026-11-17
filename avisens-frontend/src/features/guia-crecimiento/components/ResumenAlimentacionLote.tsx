import type { Lote } from '@features/lotes/api/lotes'
import type { PlanAlimentoGuia, PlanLoteGuia } from '../api/guiaCrecimiento'
import type { FaseCicloVisual, RegistroMortalidadSimple } from '../model/etapasAlimentacion'
import './ResumenAlimentacionLote.css'

type Props = {
  plan: PlanLoteGuia | null
  alimento: PlanAlimentoGuia | null
  fases: FaseCicloVisual[]
  lote?: Lote | null
  mortalidad?: RegistroMortalidadSimple[] | null
  cargandoAlimento: boolean
}

function formatearNumero(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—'
  return Math.round(valor).toLocaleString('es-CO')
}

export default function ResumenAlimentacionLote({
  plan,
  alimento,
  fases,
  lote,
  mortalidad,
  cargandoAlimento,
}: Props) {
  const diaSalida = plan?.resultado.dia_objetivo
  const tienePlan = plan !== null && diaSalida !== null

  const cantidadInicial =
    lote?.cantidad_inicial ??
    alimento?.corte?.cantidad_inicial ??
    0

  const bajasRegistradas =
    mortalidad && mortalidad.length > 0
      ? mortalidad.reduce((acc, m) => acc + (m.cantidad_aves ?? m.muertes ?? 0), 0)
      : alimento?.corte?.muertes ?? 0

  const avesVivasActual = Math.max(0, cantidadInicial - bajasRegistradas)

  const sumaKg = fases.reduce((s, f) => s + (f.consumoTotalKg ?? 0), 0)
  const sumaBultos = fases.reduce((s, f) => s + (f.bultos40kg ?? 0), 0)

  const consumoTotalKg = sumaKg > 0 ? sumaKg : alimento?.resultado.consumo_total_kg ?? null
  const totalBultos =
    sumaBultos > 0
      ? sumaBultos
      : consumoTotalKg !== null
      ? Math.max(1, Math.ceil(consumoTotalKg / 40))
      : null

  const subtituloLote = tienePlan
    ? bajasRegistradas > 0
      ? `Plan para lote de ${formatearNumero(cantidadInicial)} aves (${formatearNumero(avesVivasActual)} vivas) hasta la salida (Día ${diaSalida})`
      : `Plan para lote de ${formatearNumero(cantidadInicial)} aves hasta la salida (Día ${diaSalida})`
    : 'Estimación de alimento por etapa de cría'

  return (
    <section className="gdc-alimento-card" aria-labelledby="gdc-alimento-titulo">
      <div className="gdc-alimento-cabecera">
        <div>
          <h3 id="gdc-alimento-titulo">Alimentación recomendada</h3>
          <p className="gdc-alimento-subtitulo">{subtituloLote}</p>
        </div>
        {cargandoAlimento && (
          <span className="gdc-alimento-cargando" role="status">Calculando…</span>
        )}
      </div>

      {!tienePlan ? (
        <p className="gdc-alimento-vacio">
          Ingresa un peso objetivo en la meta de venta para calcular las etapas de cría y los bultos necesarios para este lote.
        </p>
      ) : (
        <>
          <div className="gdc-alimento-totales">
            <div className="gdc-alimento-total-item">
              <span className="gdc-alimento-total-label">Aves vivas</span>
              <strong className="gdc-alimento-total-valor">
                {avesVivasActual > 0 ? `${formatearNumero(avesVivasActual)} aves` : '—'}
              </strong>
              <span className="gdc-alimento-total-sub">
                {bajasRegistradas > 0
                  ? `${formatearNumero(bajasRegistradas)} bajas en bitácora · ${formatearNumero(cantidadInicial)} iniciales`
                  : `${formatearNumero(cantidadInicial)} iniciales · Sin bajas`}
              </span>
            </div>
            <div className="gdc-alimento-total-item">
              <span className="gdc-alimento-total-label">Total lote</span>
              <strong className="gdc-alimento-total-valor">
                {consumoTotalKg !== null ? `${formatearNumero(consumoTotalKg)} kg` : '—'}
              </strong>
              <span className="gdc-alimento-total-sub">Alimento requerido hasta la salida</span>
            </div>
            <div className="gdc-alimento-total-item gdc-alimento-total-item--destacado">
              <span className="gdc-alimento-total-label">Bultos requeridos (40 kg)</span>
              <strong className="gdc-alimento-total-valor">
                {totalBultos !== null ? `${formatearNumero(totalBultos)} bultos` : '—'}
              </strong>
              <span className="gdc-alimento-total-sub">Sacos de 40 kg a comprar</span>
            </div>
          </div>

          <div className="gdc-alimento-tabla-contenedor">
            <table className="gdc-alimento-tabla">
              <thead>
                <tr>
                  <th>Etapa</th>
                  <th>Días</th>
                  <th>Alimento</th>
                  <th className="gdc-col-num">Aves vivas</th>
                  <th className="gdc-col-num">Total kg</th>
                  <th className="gdc-col-num">Bultos 40 kg</th>
                </tr>
              </thead>
              <tbody>
                {fases.map((fase) => {
                  const bultosFase =
                    fase.bultos40kg !== undefined && fase.bultos40kg !== null
                      ? fase.bultos40kg
                      : fase.consumoTotalKg
                      ? Math.max(1, Math.ceil(fase.consumoTotalKg / 40))
                      : null

                  return (
                    <tr key={fase.orden} className={`gdc-fila-etapa gdc-fila-etapa--${fase.etapa}`}>
                      <td>
                        <span className="gdc-etapa-indicador">
                          <span
                            className={`regla-etapa-punto regla-etapa-punto--${fase.etapa}`}
                            aria-hidden="true"
                          />
                          <strong>{fase.nombreEtapa}</strong>
                        </span>
                      </td>
                      <td>
                        {fase.diaInicio === fase.diaFin
                          ? `Día ${fase.diaInicio}`
                          : `${fase.diaInicio} a ${fase.diaFin}`}
                      </td>
                      <td className="gdc-alimento-nombre-celda">{fase.alimento}</td>
                      <td className="gdc-col-num">
                        {fase.avesVivas !== null && fase.avesVivas !== undefined
                          ? `${formatearNumero(fase.avesVivas)} aves`
                          : avesVivasActual > 0
                          ? `${formatearNumero(avesVivasActual)} aves`
                          : '—'}
                      </td>
                      <td className="gdc-col-num">
                        {fase.consumoTotalKg !== null && fase.consumoTotalKg !== undefined
                          ? `${formatearNumero(fase.consumoTotalKg)} kg`
                          : '—'}
                      </td>
                      <td className="gdc-col-num">
                        {bultosFase !== null ? (
                          <strong className="gdc-bultos-badge">{bultosFase}</strong>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
