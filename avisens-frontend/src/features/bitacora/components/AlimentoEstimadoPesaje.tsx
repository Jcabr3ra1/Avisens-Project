import { useAlimentoDelLote } from '../hooks/useAlimentoDelLote'

type Props = { loteId: number }

const kg = (valor: number) => valor.toLocaleString('es-CO', { maximumFractionDigits: 1 })

// Alimento que el lote necesita hasta su día objetivo, tal como lo calculó el
// backend a partir del plan de crecimiento. Es informativo: no se envía con
// el pesaje.
function AlimentoEstimadoPesaje({ loteId }: Props) {
  const { resumen, cargando, error } = useAlimentoDelLote(loteId)

  return (
    <section className="bit-alimento" aria-label="Alimento estimado del lote" aria-live="polite">
      <p className="bit-kicker">Alimento estimado del lote</p>

      {cargando ? (
        <p className="bit-alimento-texto">Consultando el plan del lote…</p>
      ) : error ? (
        <p className="bit-alimento-texto bit-alimento-texto--error">{error}</p>
      ) : resumen?.estado === 'calculado' ? (
        <>
          <p className="bit-alimento-total">
            <strong>{kg(resumen.totalKg)} kg</strong>
            {resumen.diaObjetivo !== null && <span> hasta el día {resumen.diaObjetivo}</span>}
          </p>
          <p className="bit-alimento-texto">
            {resumen.porAveG !== null && <>{kg(resumen.porAveG)} g por ave</>}
            {resumen.porAveG !== null && resumen.avesVivas !== null && ' · '}
            {resumen.avesVivas !== null && <>{resumen.avesVivas.toLocaleString('es-CO')} aves vivas</>}
          </p>
          {resumen.avisos.length > 0 && (
            <ul className="bit-alimento-avisos">
              {resumen.avisos.map((aviso) => <li key={aviso}>{aviso}</li>)}
            </ul>
          )}
        </>
      ) : (
        resumen && <p className="bit-alimento-texto">{resumen.mensaje}</p>
      )}
    </section>
  )
}

export default AlimentoEstimadoPesaje
