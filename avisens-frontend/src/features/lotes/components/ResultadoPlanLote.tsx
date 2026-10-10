import type { PlanLote } from '../api/plan-lote'
import {
  DESCRIPCION_DESACTUALIZADO_PLAN,
  etiquetaEstadoPlan,
  explicacionEstadoPlan,
  tonoEstadoPlan,
} from '../model/planLoteVista'
import { gramosALibras } from '../model/pesoObjetivo'

interface Props {
  plan: PlanLote
  puedeRegistrar: boolean
  recalculando: boolean
  onRecalcular: () => void
}

function ResultadoPlanLote({ plan, puedeRegistrar, recalculando, onRecalcular }: Props) {
  const explicacion = explicacionEstadoPlan(plan)

  return (
    <div className="pdl-bloque">
      <div className="pdl-bloque-cabecera">
        <h3>Plan de crecimiento</h3>
        <span className={`tg-badge tg-badge--${tonoEstadoPlan(plan.estado_dia)}`}>
          {etiquetaEstadoPlan(plan.estado_dia)}
        </span>
      </div>

      {explicacion && <p className="adm-aviso">{explicacion}</p>}

      <dl className="pdl-datos">
        <div>
          <dt>Peso objetivo</dt>
          <dd>
            {plan.peso_objetivo_g.toLocaleString()} g (
            {gramosALibras(plan.peso_objetivo_g).toFixed(2)} lb)
          </dd>
        </div>
        <div>
          <dt>Día objetivo</dt>
          <dd>{plan.resultado.dia_objetivo ?? '—'}</dd>
        </div>
        <div>
          <dt>Día interpolado</dt>
          <dd>{plan.resultado.dia_objetivo_interpolado?.toFixed(2) ?? '—'}</dd>
        </div>
        <div>
          <dt>Fecha de salida estimada</dt>
          <dd>{plan.resultado.fecha_salida_calculada?.slice(0, 10) ?? '—'}</dd>
        </div>
      </dl>

      {plan.desactualizado && (
        <div className="adm-alerta" role="status">
          <span>{DESCRIPCION_DESACTUALIZADO_PLAN}</span>
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

export default ResultadoPlanLote
