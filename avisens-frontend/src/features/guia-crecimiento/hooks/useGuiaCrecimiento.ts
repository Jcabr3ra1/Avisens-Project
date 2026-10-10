import { useCallback, useEffect, useState } from 'react'
import { diasDeVida } from '@shared/utils/fechas'
import { mensajeDeError } from '@shared/utils/errores'
import {
  compararConCurva,
  crearPlanLote,
  getPlanAlimentoLote,
  getPlanLote,
  guardarPlanAlimentoLote,
  listarCurvasGeneticas,
  listarIndicadores,
  listarLotes,
  obtenerCurvaGenetica,
  recalcularPlanLote,
  type PlanAlimentoGuia,
  type PlanLoteGuia,
  type ComparacionLote,
  type CurvaGenetica,
  type IndicadorLote,
  type LoteGuia,
} from '../api/guiaCrecimiento'
function esErrorConEstado(error: unknown, estado: number): boolean {
  return (error as { response?: { status?: number } }).response?.status === estado
}

export function useGuiaCrecimiento() {
  const [lotes, setLotes] = useState<LoteGuia[]>([])
  const [todosLosLotes, setTodosLosLotes] = useState<LoteGuia[]>([])
  const [loteId, setLoteId] = useState<number | null>(null)
  const [curva, setCurva] = useState<CurvaGenetica | null>(null)
  const [indicadores, setIndicadores] = useState<IndicadorLote[]>([])
  const [comparacion, setComparacion] = useState<ComparacionLote | null>(null)
  const [cargandoLotes, setCargandoLotes] = useState(true)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [error, setError] = useState('')
  const [plan, setPlan] = useState<PlanLoteGuia | null>(null)
  const [alimento, setAlimento] = useState<PlanAlimentoGuia | null>(null)
  const [cargandoPlan, setCargandoPlan] = useState(false)
  const [cargandoAlimento, setCargandoAlimento] = useState(false)
  const [errorPlan, setErrorPlan] = useState('')
  const [errorAlimento, setErrorAlimento] = useState('')

  const recargarLotes = useCallback(async () => {
    setCargandoLotes(true)
    setError('')
    try {
      const datos = await listarLotes()
      const activos = datos.filter((lote) => lote.estado === 'activo')
      setTodosLosLotes(datos)
      setLotes(activos)
      setLoteId((actual) => actual !== null && activos.some((lote) => lote.id === actual)
        ? actual
        : activos[0]?.id ?? null)
    } catch (errorCarga) {
      setError(mensajeDeError(errorCarga, 'No se pudieron cargar los lotes activos.'))
    } finally {
      setCargandoLotes(false)
    }
  }, [])

  useEffect(() => { void recargarLotes() }, [recargarLotes])

  useEffect(() => {
    if (loteId === null) {
      setCurva(null)
      setIndicadores([])
      setComparacion(null)
      setPlan(null)
      setAlimento(null)
      setCargandoPlan(false)
      setCargandoAlimento(false)
      setErrorPlan('')
      setErrorAlimento('')
      return
    }

    let vigente = true
    const lote = lotes.find((item) => item.id === loteId)
    if (!lote) return

    setPlan(null)
    setAlimento(null)
    setCargandoPlan(true)
    setCargandoAlimento(true)
    setErrorPlan('')
    setErrorAlimento('')

    void getPlanLote(loteId)
      .then((datosPlan) => {
        if (vigente) setPlan(datosPlan)
      })
      .catch((errorCarga) => {
        if (vigente) setErrorPlan(mensajeDeError(errorCarga, 'No se pudo cargar el plan productivo.'))
      })
      .finally(() => {
        if (vigente) setCargandoPlan(false)
      })

    void getPlanAlimentoLote(loteId)
      .then((datosAlimento) => {
        if (vigente) setAlimento(datosAlimento)
      })
      .catch((errorCarga) => {
        if (vigente) setErrorAlimento(mensajeDeError(errorCarga, 'No se pudo cargar la estimación de alimento.'))
      })
      .finally(() => {
        if (vigente) setCargandoAlimento(false)
      })

    setCargandoDetalle(true)
    setError('')
    void Promise.all([
      listarCurvasGeneticas(),
      listarIndicadores(loteId),
    ])
      .then(async ([curvas, datosIndicadores]) => {
        const sexo = lote.sexo ?? 'mixto'
        const resumen = curvas.find((item) => (
          item.linea_genetica_id === lote.linea_genetica?.id
          && item.sexo === sexo
          && item.vigente
        ))
        const curvaCompleta = resumen ? await obtenerCurvaGenetica(resumen.id) : null
        let comparacionActual: ComparacionLote | null = null
        try {
          comparacionActual = await compararConCurva(loteId)
        } catch (errorComparacion) {
          if (esErrorConEstado(errorComparacion, 403)) throw errorComparacion
        }
        if (!vigente) return
        setCurva(curvaCompleta)
        setIndicadores(datosIndicadores)
        setComparacion(comparacionActual)
      })
      .catch((errorCarga) => {
        if (vigente) setError(esErrorConEstado(errorCarga, 403)
          ? 'El servidor no permite consultar los datos de este lote con tu rol.'
          : mensajeDeError(errorCarga, 'No se pudo cargar la guía de este lote.'))
      })
      .finally(() => { if (vigente) setCargandoDetalle(false) })

    return () => { vigente = false }
  }, [loteId, lotes, todosLosLotes])

  const loteSeleccionado = lotes.find((lote) => lote.id === loteId) ?? null
  const indicadorReciente = [...indicadores]
    .filter((indicador) => indicador.dia_vida !== null)
    .sort((a, b) => (b.dia_vida ?? 0) - (a.dia_vida ?? 0))[0] ?? null

  const recalcularPlan = useCallback(async (motivo?: string) => {
    if (loteId === null) throw new Error('No hay un lote seleccionado.')
    setCargandoPlan(true)
    setErrorPlan('')
    try {
      const datosPlan = await recalcularPlanLote(loteId, { motivo })
      setPlan(datosPlan)
      setCargandoAlimento(true)
      setErrorAlimento('')
      try {
        setAlimento(await getPlanAlimentoLote(loteId))
      } catch (errorCarga) {
        setErrorAlimento(mensajeDeError(errorCarga, 'No se pudo actualizar la estimación de alimento.'))
      } finally {
        setCargandoAlimento(false)
      }
      return datosPlan
    } catch (errorCarga) {
      setErrorPlan(mensajeDeError(errorCarga, 'No se pudo recalcular el plan productivo.'))
      throw errorCarga
    } finally {
      setCargandoPlan(false)
    }
  }, [loteId])

  const guardarPlanAlimento = useCallback(async (motivo?: string) => {
    if (loteId === null) throw new Error('No hay un lote seleccionado.')
    setCargandoAlimento(true)
    setErrorAlimento('')
    try {
      const datosAlimento = await guardarPlanAlimentoLote(loteId, { motivo })
      setAlimento(datosAlimento)
      return datosAlimento
    } catch (errorCarga) {
      setErrorAlimento(mensajeDeError(errorCarga, 'No se pudo generar la estimación de alimento.'))
      throw errorCarga
    } finally {
      setCargandoAlimento(false)
    }
  }, [loteId])

  const crearPlan = useCallback(async (pesoObjetivoG: number, motivo?: string) => {
    if (loteId === null) throw new Error('No hay un lote seleccionado.')
    setCargandoPlan(true)
    setErrorPlan('')
    try {
      const datosPlan = await crearPlanLote(loteId, {
        peso_objetivo_g: pesoObjetivoG,
        motivo,
      })
      setPlan(datosPlan)
      if (datosPlan.estado_dia === 'calculado') {
        setCargandoAlimento(true)
        setErrorAlimento('')
        try {
          setAlimento(await getPlanAlimentoLote(loteId))
        } catch (errorCarga) {
          setErrorAlimento(mensajeDeError(errorCarga, 'No se pudo actualizar la estimación de alimento.'))
        } finally {
          setCargandoAlimento(false)
        }
      }
      return datosPlan
    } catch (errorCarga) {
      setErrorPlan(mensajeDeError(errorCarga, 'No se pudo guardar el peso objetivo.'))
      throw errorCarga
    } finally {
      setCargandoPlan(false)
    }
  }, [loteId])

  return {
    lotes,
    loteSeleccionado,
    loteId,
    seleccionarLote: setLoteId,
    curva,
    indicadores,
    indicadorReciente,
    comparacion,
    plan,
    alimento,
    cargandoPlan,
    cargandoAlimento,
    errorPlan,
    errorAlimento,
    crearPlan,
    recalcularPlan,
    guardarPlanAlimento,
    diaActual: loteSeleccionado ? diasDeVida(loteSeleccionado.fecha_ingreso) : null,
    cargando: cargandoLotes || cargandoDetalle,
    error,
    recargar: recargarLotes,
  }
}