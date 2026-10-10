import { useCallback, useEffect, useRef, useState } from 'react'
import { obtenerLote, type Lote } from '@features/lotes/api/lotes'
import { diasDeVida } from '@shared/utils/fechas'
import { mensajeDeError } from '@shared/utils/errores'
import { crearGuardaDeSecuencia } from '@shared/utils/secuencia'
import {
  crearPlanLote, getPlanAlimentoLote, getPlanLote,
  guardarPlanAlimentoLote, listarCurvasGeneticas, listarIndicadores,
  obtenerCurvaGenetica, recalcularPlanLote,
  type PlanAlimentoGuia, type PlanLoteGuia,
  type CurvaGenetica, type IndicadorLote,
} from '../api/guiaCrecimiento'

type Contexto = { loteId: number; vigente: boolean }
type EstadoGuia = {
  loteId: number | null
  loteSeleccionado: Lote | null
  curva: CurvaGenetica | null
  indicadores: IndicadorLote[]
  plan: PlanLoteGuia | null
  alimento: PlanAlimentoGuia | null
  cargandoLote: boolean
  cargandoDetalle: boolean
  cargandoPlan: boolean
  cargandoAlimento: boolean
  guardando: boolean
  error: string
  errorPlan: string
  errorAlimento: string
}

function estadoInicial(loteId: number | null): EstadoGuia {
  return {
    loteId, loteSeleccionado: null, curva: null, indicadores: [],
    plan: null, alimento: null, cargandoLote: loteId !== null, cargandoDetalle: false,
    cargandoPlan: false, cargandoAlimento: false, guardando: false,
    error: '', errorPlan: '', errorAlimento: '',
  }
}

// La guía pertenece al lote recibido desde su pantalla padre. Cada carga y
// mutación conserva ese contexto y su secuencia hasta que termina.
export function useGuiaCrecimiento(loteId: number | null) {
  const [estado, setEstado] = useState(() => estadoInicial(loteId))
  const [revisionCarga, setRevisionCarga] = useState(0)
  const contexto = useRef<Contexto | null>(null)
  const operacion = useRef<Contexto | null>(null)
  const secuenciaPlan = useRef(crearGuardaDeSecuencia())
  const secuenciaAlimento = useRef(crearGuardaDeSecuencia())

  const actualizar = useCallback((actual: Contexto, datos: Partial<EstadoGuia>) => {
    if (!actual.vigente || contexto.current !== actual) return
    setEstado((anterior) => anterior.loteId === actual.loteId
      ? { ...anterior, ...datos }
      : anterior)
  }, [])

  const cargarAlimento = useCallback(async (actual: Contexto) => {
    const pedido = secuenciaAlimento.current.iniciar()
    actualizar(actual, { cargandoAlimento: true, errorAlimento: '' })
    try {
      const alimento = await getPlanAlimentoLote(actual.loteId)
      if (secuenciaAlimento.current.esVigente(pedido)) actualizar(actual, { alimento })
    } catch (error) {
      if (secuenciaAlimento.current.esVigente(pedido)) {
        actualizar(actual, { errorAlimento: mensajeDeError(error, 'No se pudo cargar la estimación de alimento.') })
      }
    } finally {
      if (secuenciaAlimento.current.esVigente(pedido)) actualizar(actual, { cargandoAlimento: false })
    }
  }, [actualizar])

  useEffect(() => {
    const planes = secuenciaPlan.current
    const alimentos = secuenciaAlimento.current
    setEstado(estadoInicial(loteId))
    planes.iniciar()
    alimentos.iniciar()
    operacion.current = null
    if (loteId === null) {
      contexto.current = null
      return
    }
    const actual: Contexto = { loteId, vigente: true }
    contexto.current = actual

    void obtenerLote(loteId).then((lote) => {
      if (!actual.vigente) return
      actualizar(actual, { loteSeleccionado: lote, cargandoLote: false })
      if (lote.estado !== 'activo') return

      const pedidoPlan = planes.iniciar()
      actualizar(actual, { cargandoPlan: true, cargandoDetalle: true })
      void getPlanLote(loteId)
        .then((plan) => {
          if (planes.esVigente(pedidoPlan)) actualizar(actual, { plan })
        })
        .catch((error) => {
          if (planes.esVigente(pedidoPlan)) {
            actualizar(actual, { errorPlan: mensajeDeError(error, 'No se pudo cargar el plan productivo.') })
          }
        })
        .finally(() => {
          if (planes.esVigente(pedidoPlan)) actualizar(actual, { cargandoPlan: false })
        })
      void cargarAlimento(actual)
      void Promise.all([
        listarCurvasGeneticas(), listarIndicadores(loteId),
      ]).then(async ([curvas, indicadores]) => {
        if (!actual.vigente) return
        const resumen = curvas.find((curva) => curva.linea_genetica_id === lote.linea_genetica?.id
          && curva.sexo === (lote.sexo ?? 'mixto') && curva.vigente)
        const curva = resumen ? await obtenerCurvaGenetica(resumen.id) : null
        actualizar(actual, { curva, indicadores })
      }).catch((error) => {
        actualizar(actual, { error: mensajeDeError(error, 'No se pudo cargar la guía de este lote.') })
      }).finally(() => actualizar(actual, { cargandoDetalle: false }))
    }).catch((error) => {
      actualizar(actual, { cargandoLote: false, error: mensajeDeError(error, 'No se pudo cargar este lote.') })
    })

    return () => {
      actual.vigente = false
      planes.iniciar()
      alimentos.iniciar()
    }
  }, [loteId, revisionCarga, actualizar, cargarAlimento])

  const mutarPlan = useCallback(async (pesoObjetivoG: number | null, motivo?: string) => {
    const actual = contexto.current
    if (!actual?.vigente || actual.loteId !== loteId) throw new Error('Abre la guía desde el lote que quieres consultar.')
    if (operacion.current === actual) throw new Error('Espera a que termine el guardado actual.')
    operacion.current = actual
    const pedido = secuenciaPlan.current.iniciar()
    secuenciaAlimento.current.iniciar()
    actualizar(actual, { guardando: true, cargandoPlan: true, errorPlan: '', alimento: null, cargandoAlimento: true, errorAlimento: '' })
    try {
      const plan = pesoObjetivoG === null
        ? await recalcularPlanLote(actual.loteId, { motivo })
        : await crearPlanLote(actual.loteId, { peso_objetivo_g: pesoObjetivoG, motivo })
      if (actual.vigente && secuenciaPlan.current.esVigente(pedido)) {
        actualizar(actual, { plan })
        // Se relee incluso si el nuevo plan no tiene día objetivo: una
        // estimación anterior debe reflejar la nueva versión del plan.
        await cargarAlimento(actual)
      }
      return plan
    } catch (error) {
      if (actual.vigente && secuenciaPlan.current.esVigente(pedido)) {
        actualizar(actual, { errorPlan: mensajeDeError(error, 'No se pudo guardar el plan productivo.') })
        await cargarAlimento(actual)
      }
      throw error
    } finally {
      if (operacion.current === actual) operacion.current = null
      if (secuenciaPlan.current.esVigente(pedido)) actualizar(actual, { guardando: false, cargandoPlan: false })
    }
  }, [loteId, actualizar, cargarAlimento])

  const guardarPlanAlimento = useCallback(async (motivo?: string) => {
    const actual = contexto.current
    if (!actual?.vigente || actual.loteId !== loteId) throw new Error('Abre la guía desde el lote que quieres consultar.')
    if (operacion.current === actual) throw new Error('Espera a que termine el guardado actual.')
    operacion.current = actual
    const pedido = secuenciaAlimento.current.iniciar()
    actualizar(actual, { guardando: true, cargandoAlimento: true, errorAlimento: '' })
    try {
      const alimento = await guardarPlanAlimentoLote(actual.loteId, { motivo })
      if (secuenciaAlimento.current.esVigente(pedido)) actualizar(actual, { alimento })
      return alimento
    } catch (error) {
      if (secuenciaAlimento.current.esVigente(pedido)) {
        actualizar(actual, { errorAlimento: mensajeDeError(error, 'No se pudo generar la estimación de alimento.') })
      }
      throw error
    } finally {
      if (operacion.current === actual) operacion.current = null
      if (secuenciaAlimento.current.esVigente(pedido)) actualizar(actual, { guardando: false, cargandoAlimento: false })
    }
  }, [loteId, actualizar])

  // Al cambiar de URL se ocultan los datos anteriores antes de que se ejecute
  // el nuevo efecto, evitando un render con el encabezado de otro lote.
  const vista = estado.loteId === loteId ? estado : estadoInicial(loteId)
  const recargar = useCallback(() => setRevisionCarga((revision) => revision + 1), [])
  const crearPlan = useCallback((pesoObjetivoG: number, motivo?: string) => mutarPlan(pesoObjetivoG, motivo), [mutarPlan])
  const recalcularPlan = useCallback((motivo?: string) => mutarPlan(null, motivo), [mutarPlan])
  const indicadorReciente = [...vista.indicadores]
    .sort((a, b) => b.fecha.localeCompare(a.fecha))[0] ?? null
  return {
    ...vista, indicadorReciente,
    diaActual: vista.loteSeleccionado ? diasDeVida(vista.loteSeleccionado.fecha_ingreso.slice(0, 10)) : null,
    cargando: vista.cargandoLote || vista.cargandoDetalle,
    recargar, crearPlan, recalcularPlan, guardarPlanAlimento,
  }
}
