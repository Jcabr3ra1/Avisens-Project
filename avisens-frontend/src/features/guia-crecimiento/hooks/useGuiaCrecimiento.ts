import { useCallback, useEffect, useState } from 'react'
import { diasDeVida } from '@shared/utils/fechas'
import { mensajeDeError } from '@shared/utils/errores'
import {
  compararConCurva,
  crearPlanLote,
  listarCurvasGeneticas,
  listarIndicadores,
  listarLotes,
  obtenerCurvaGenetica,
  type ComparacionLote,
  type CurvaGenetica,
  type IndicadorLote,
  type LoteGuia,
  type PlanLote,
} from '../api/guiaCrecimiento'

function esErrorConEstado(error: unknown, estado: number): boolean {
  return (error as { response?: { status?: number } }).response?.status === estado
}

export function useGuiaCrecimiento() {
  const [lotes, setLotes] = useState<LoteGuia[]>([])
  const [loteId, setLoteId] = useState<number | null>(null)
  const [curva, setCurva] = useState<CurvaGenetica | null>(null)
  const [indicadores, setIndicadores] = useState<IndicadorLote[]>([])
  const [comparacion, setComparacion] = useState<ComparacionLote | null>(null)
  const [plan, setPlan] = useState<PlanLote | null>(null)
  const [cargandoLotes, setCargandoLotes] = useState(true)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [error, setError] = useState('')

  const recargarLotes = useCallback(async () => {
    setCargandoLotes(true)
    setError('')
    try {
      const datos = await listarLotes()
      const activos = datos.filter((lote) => lote.estado === 'activo')
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
      return
    }

    let vigente = true
    const lote = lotes.find((item) => item.id === loteId)
    if (!lote) return

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
  }, [loteId, lotes])

  const loteSeleccionado = lotes.find((lote) => lote.id === loteId) ?? null
  const indicadorReciente = [...indicadores]
    .filter((indicador) => indicador.dia_vida !== null)
    .sort((a, b) => (b.dia_vida ?? 0) - (a.dia_vida ?? 0))[0] ?? null

  const guardarPlan = useCallback(async (pesoObjetivoG: number) => {
    if (loteId === null) throw new Error('No hay lote seleccionado.')
    const creado = await crearPlanLote(loteId, {
      peso_objetivo_g: pesoObjetivoG,
      motivo: 'Definido desde la guía de crecimiento',
    })
    setPlan(creado)
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
    diaActual: loteSeleccionado ? diasDeVida(loteSeleccionado.fecha_ingreso) : null,
    cargando: cargandoLotes || cargandoDetalle,
    error,
    recargar: recargarLotes,
    guardarPlan,
  }
}