import { useState } from 'react'
import { getRol } from '@shared/api'
import { permisosDePlan } from '@shared/auth/permisos'
import { mensajeDeError } from '@shared/utils/errores'
import '@shared/ui/admin/AdminKit.css'
import '@shared/ui/TablaGestion/TablaGestion.css'
import type { Lote } from '../api/lotes'
import { usePlanCrecimiento } from '../hooks/usePlanCrecimiento'
import FormularioPesoObjetivo from './FormularioPesoObjetivo'
import ResultadoPlanLote from './ResultadoPlanLote'
import EstimacionAlimento from './EstimacionAlimento'
import './PlanDeLote.css'

interface Props {
  lote: Lote
}

function PlanDeLote({ lote }: Props) {
  const permisos = permisosDePlan(getRol())
  const { plan, alimento, avisoAlimento, crear, recalcular, recalcularAlimento } =
    usePlanCrecimiento(lote.id)
  const [recalculandoPlan, setRecalculandoPlan] = useState(false)
  const [errorRecalculoPlan, setErrorRecalculoPlan] = useState('')
  const [recalculandoAlimento, setRecalculandoAlimento] = useState(false)

  async function manejarRecalcularPlan() {
    setRecalculandoPlan(true)
    setErrorRecalculoPlan('')
    try {
      await recalcular()
    } catch (error) {
      // El plan anterior sigue siendo valido: esto es un aviso, no un bloqueo.
      setErrorRecalculoPlan(mensajeDeError(error, 'No se pudo recalcular el plan.'))
    } finally {
      setRecalculandoPlan(false)
    }
  }

  async function manejarRecalcularAlimento() {
    setRecalculandoAlimento(true)
    try {
      await recalcularAlimento()
    } finally {
      setRecalculandoAlimento(false)
    }
  }

  return (
    <div className="pdl">
      {permisos.registrar && !plan.cargando && !plan.error && (
        <div className="pdl-bloque">
          <FormularioPesoObjetivo
            key={plan.data?.id ?? 'nuevo'}
            pesoActualG={plan.data?.peso_objetivo_g ?? null}
            onEnviar={(pesoObjetivoG) => crear({ peso_objetivo_g: pesoObjetivoG })}
          />
        </div>
      )}

      {plan.cargando ? (
        <p className="tg-vacio" role="status">
          Cargando plan…
        </p>
      ) : plan.error ? (
        <div className="adm-alerta" role="alert">
          <span>{plan.error}</span>
        </div>
      ) : plan.data === null ? (
        <p className="tg-vacio">
          {permisos.registrar
            ? 'Este lote todavía no tiene un plan de crecimiento. Ingresa el peso objetivo arriba para calcularlo.'
            : 'Este lote todavía no tiene un plan de crecimiento.'}
        </p>
      ) : (
        <>
          <ResultadoPlanLote
            plan={plan.data}
            puedeRegistrar={permisos.registrar}
            recalculando={recalculandoPlan}
            onRecalcular={() => void manejarRecalcularPlan()}
          />
          {errorRecalculoPlan && (
            <div className="adm-alerta" role="alert">
              <span>{errorRecalculoPlan}</span>
            </div>
          )}
        </>
      )}

      {alimento.cargando ? (
        <p className="tg-vacio" role="status">
          Cargando estimación de alimento…
        </p>
      ) : alimento.error ? (
        <div className="adm-alerta" role="alert">
          <span>{alimento.error}</span>
        </div>
      ) : alimento.data === null ? (
        <div className="pdl-bloque">
          <p className="tg-vacio">Todavía no hay una estimación de alimento para este lote.</p>
          {permisos.registrar && plan.data?.estado_dia === 'calculado' && (
            <button
              type="button"
              className="adm-btn adm-btn--secundario"
              onClick={() => void manejarRecalcularAlimento()}
              disabled={recalculandoAlimento}
            >
              {recalculandoAlimento
                ? 'Calculando…'
                : avisoAlimento
                  ? 'Reintentar cálculo'
                  : 'Calcular alimento'}
            </button>
          )}
        </div>
      ) : (
        <EstimacionAlimento
          estimacion={alimento.data}
          puedeRegistrar={permisos.registrar}
          recalculando={recalculandoAlimento}
          onRecalcular={() => void manejarRecalcularAlimento()}
        />
      )}

      {avisoAlimento && (
        <div className="adm-aviso" role="status">
          <span>{avisoAlimento}</span>
        </div>
      )}
    </div>
  )
}

export default PlanDeLote
