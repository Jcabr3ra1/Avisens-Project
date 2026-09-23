import { useCallback, useEffect, useState } from 'react'
import { mensajeDeError } from '@shared/utils/errores'
import {
  crearPlanLote,
  obtenerPlanLote,
  recalcularPlanLote,
  type CrearPlanLotePayload,
  type PlanLote,
} from '../api/plan-lote'
import {
  crearEstimacionAlimento,
  obtenerEstimacionAlimento,
  type EstimacionAlimentoPlan,
} from '../api/plan-alimento'

interface EstadoRecurso<T> {
  data: T | null
  cargando: boolean
  error: string
}

const INICIAL = <T,>(): EstadoRecurso<T> => ({ data: null, cargando: true, error: '' })

export function usePlanCrecimiento(loteId: number) {
  const [plan, setPlan] = useState<EstadoRecurso<PlanLote>>(INICIAL)
  const [alimento, setAlimento] = useState<EstadoRecurso<EstimacionAlimentoPlan>>(INICIAL)
  // Aviso NO bloqueante: el alimento pudo fallar sin invalidar un plan que
  // sí se guardó bien. Se muestra aparte del error de carga de `alimento`.
  const [avisoAlimento, setAvisoAlimento] = useState('')

  const cargarPlan = useCallback(async () => {
    setPlan((actual) => ({ ...actual, cargando: true, error: '' }))
    try {
      const data = await obtenerPlanLote(loteId)
      setPlan({ data, cargando: false, error: '' })
    } catch (error) {
      setPlan({ data: null, cargando: false, error: mensajeDeError(error, 'No se pudo cargar el plan del lote.') })
    }
  }, [loteId])

  const cargarAlimento = useCallback(async () => {
    setAlimento((actual) => ({ ...actual, cargando: true, error: '' }))
    try {
      const data = await obtenerEstimacionAlimento(loteId)
      setAlimento({ data, cargando: false, error: '' })
    } catch (error) {
      setAlimento({ data: null, cargando: false, error: mensajeDeError(error, 'No se pudo cargar la estimación de alimento.') })
    }
  }, [loteId])

  // Cargas independientes: una no espera a la otra ni oculta a la otra.
  useEffect(() => {
    void cargarPlan()
    void cargarAlimento()
  }, [cargarPlan, cargarAlimento])

  const dispararAlimento = useCallback(async () => {
    setAvisoAlimento('')
    setAlimento((actual) => ({ ...actual, cargando: true }))
    try {
      const data = await crearEstimacionAlimento(loteId)
      setAlimento({ data, cargando: false, error: '' })
    } catch (error) {
      // El calculo fallo: no dejamos la estimacion anterior (de otra version
      // del plan) puesta como si siguiera vigente -- se relee por GET, que
      // recalcula plan_vigente/desactualizado contra el plan actual.
      setAvisoAlimento(mensajeDeError(error, 'No se pudo calcular la estimación de alimento.'))
      await cargarAlimento()
    }
  }, [loteId, cargarAlimento])

  const crear = useCallback(
    async (payload: CrearPlanLotePayload) => {
      const nuevoPlan = await crearPlanLote(loteId, payload)
      setPlan({ data: nuevoPlan, cargando: false, error: '' })
      if (nuevoPlan.estado_dia === 'calculado') {
        await dispararAlimento()
      } else {
        // Sin dia_objetivo no hay nada que calcular, pero una estimacion de
        // una version anterior del plan pudo quedar en pantalla: se relee
        // para que su plan_vigente y desactualizado reflejen este plan nuevo.
        await cargarAlimento()
      }
      return nuevoPlan
    },
    [loteId, dispararAlimento, cargarAlimento],
  )

  const recalcular = useCallback(
    async (motivo?: string) => {
      const nuevoPlan = await recalcularPlanLote(loteId, { motivo })
      setPlan({ data: nuevoPlan, cargando: false, error: '' })
      await dispararAlimento()
      return nuevoPlan
    },
    [loteId, dispararAlimento],
  )

  return {
    plan,
    alimento,
    avisoAlimento,
    cargarPlan,
    cargarAlimento,
    crear,
    recalcular,
    recalcularAlimento: dispararAlimento,
  }
}
