import type { EstimacionAlimentoPlan } from '../api/plan-alimento'
import {
  esEstimacionDelPlanVigente,
  etiquetaEstadoAlimento,
  etiquetaMotivo,
  explicacionEstadoAlimento,
  explicacionEstadoDesglose,
  tonoEstadoAlimento,
  tonoEstadoDesglose,
} from '../model/planAlimentoVista'
import TablaRenglonesAlimento from './TablaRenglonesAlimento'

interface Props {
  estimacion: EstimacionAlimentoPlan
  puedeRegistrar: boolean
  recalculando: boolean
  onRecalcular: () => void
}

function EstimacionAlimento({ estimacion, puedeRegistrar, recalculando, onRecalcular }: Props) {
  const esVigente = esEstimacionDelPlanVigente(estimacion)
  const explicacionAlimento = explicacionEstadoAlimento(estimacion.estado_alimento)
  const { desglose } = estimacion

  return (
    <div className="pdl-bloque">
      <div className="pdl-bloque-cabecera">
        <h3>Estimación de alimento</h3>
        <span className={`tg-badge tg-badge--${tonoEstadoAlimento(estimacion.estado_alimento)}`}>
          {etiquetaEstadoAlimento(estimacion.estado_alimento)}
        </span>
      </div>

      {!esVigente && (
        <p className="adm-aviso">
          Esta estimación es de una versión anterior del plan (versión {estimacion.plan.version}
          {estimacion.plan_vigente
            ? `; el plan vigente es la versión ${estimacion.plan_vigente.version}`
            : ''}
          ).
        </p>
      )}

      {explicacionAlimento && <p className="adm-aviso">{explicacionAlimento}</p>}

      {estimacion.estado_alimento === 'calculado' && (
        <dl className="pdl-datos">
          <div>
            <dt>Consumo por ave</dt>
            <dd>{estimacion.resultado.consumo_por_ave_g?.toLocaleString() ?? '—'} g</dd>
          </div>
          <div>
            <dt>Consumo total</dt>
            <dd>{estimacion.resultado.consumo_total_kg?.toLocaleString() ?? '—'} kg</dd>
          </div>
        </dl>
      )}

      {desglose.no_disponible ? (
        <p className="adm-aviso">El desglose por etapa no está disponible para esta estimación.</p>
      ) : desglose.estado && desglose.estado !== 'calculado' ? (
        <p className={tonoEstadoDesglose(desglose.estado) === 'peligro' ? 'adm-alerta' : 'adm-aviso'}>
          {explicacionEstadoDesglose(desglose.estado)}
        </p>
      ) : null}

      <TablaRenglonesAlimento renglones={desglose.renglones} />

      {estimacion.desactualizado && (
        <div className="adm-alerta" role="status">
          <div>
            <span>Esta estimación está desactualizada.</span>
            <ul className="pdl-motivos">
              {estimacion.motivos_desactualizacion.map((motivo) => (
                <li key={motivo}>{etiquetaMotivo(motivo)}</li>
              ))}
            </ul>
          </div>
          {puedeRegistrar && (
            <button type="button" onClick={onRecalcular} disabled={recalculando}>
              {recalculando ? 'Recalculando…' : 'Recalcular'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default EstimacionAlimento
