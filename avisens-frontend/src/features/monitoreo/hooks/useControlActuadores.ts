// useControlActuadores.ts — Órdenes y estado actual de los relés de un galpón.
//
// Una orden pasa por pendiente → enviada → aplicada/rechazada/expirada, y
// solo el ESP32 la cierra: el ciclo /ingest es de 5 s y la confirmación
// llega en el ciclo siguiente. La interfaz nunca la da por hecha antes.
//
// Todo sale de una sola consulta (GET /ordenes-actuadores/ultimas), sin
// importar cuántos relés haya: el límite de peticiones es por IP y en la
// granja lo comparten el computador, el móvil y el propio ESP32.
import { useCallback, useEffect, useRef, useState } from 'react'
import { mensajeDeError } from '@shared/utils/errores'
import {
  crearOrden,
  listarUltimasOrdenes,
  type AccionOrden,
  type EstadoRele,
  type OrdenActuador,
} from '../api/ordenesActuadores'
import { fusionarOrdenes, ordenEnCurso } from '../model/actuadores'

// Con una orden en curso la respuesta llega en 5-10 s: 4 s la ve pronto sin
// martillar. En reposo basta para notar una reversión o un cambio hecho desde
// otra pantalla.
const SONDEO_EN_CURSO_MS = 4_000
const SONDEO_REPOSO_MS = 20_000

export function useControlActuadores(galponId: number, onOrdenFinalizada: () => void) {
  const [ordenes, setOrdenes] = useState<Record<number, OrdenActuador>>({})
  const [reles, setReles] = useState<Record<number, EstadoRele>>({})
  const [enviando, setEnviando] = useState<Record<number, boolean>>({})
  const [errores, setErrores] = useState<Record<number, string>>({})
  const [errorCarga, setErrorCarga] = useState('')

  // La fuente de verdad de las órdenes vive en un ref para que el sondeo y
  // el envío fusionen sobre lo último, no sobre una copia de un render viejo.
  const ordenesRef = useRef<Record<number, OrdenActuador>>({})
  // El estado de los relés no tiene versión por fila (vigente depende de la
  // hora del servidor): se aplica solo la respuesta de la consulta más nueva.
  const secuencia = useRef(0)
  const secuenciaAplicada = useRef(0)
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)
  const siguienteCiclo = useRef<() => void>(() => undefined)
  const avisarFin = useRef(onOrdenFinalizada)
  useEffect(() => { avisarFin.current = onOrdenFinalizada }, [onOrdenFinalizada])

  const aplicarOrdenes = useCallback((nuevas: OrdenActuador[]) => {
    const previas = ordenesRef.current
    const fusion = fusionarOrdenes(previas, nuevas)
    ordenesRef.current = fusion
    setOrdenes(fusion)
    // ¿Terminó alguna que estaba en curso? Entonces cambió algo real en el
    // galpón y conviene refrescar las tarjetas.
    return Object.values(fusion).some((o) => {
      const antes = previas[o.sensor_id]
      return antes?.id === o.id && ordenEnCurso(antes) && !ordenEnCurso(o)
    })
  }, [])

  const cargar = useCallback(async () => {
    const mia = ++secuencia.current
    try {
      const respuesta = await listarUltimasOrdenes(galponId)
      const termino = aplicarOrdenes(respuesta.ordenes)
      if (mia > secuenciaAplicada.current) {
        secuenciaAplicada.current = mia
        setReles(Object.fromEntries(respuesta.reles.map((e) => [e.sensor_id, e])))
      }
      setErrorCarga('')
      if (termino) avisarFin.current()
    } catch (err) {
      setErrorCarga(mensajeDeError(err, err instanceof Error ? err.message : 'No se pudo consultar el estado de los actuadores.'))
    }
  }, [galponId, aplicarOrdenes])

  const programar = useCallback((ms: number) => {
    if (temporizador.current) clearTimeout(temporizador.current)
    temporizador.current = setTimeout(() => siguienteCiclo.current(), ms)
  }, [])

  useEffect(() => {
    let activo = true
    siguienteCiclo.current = () => {
      void cargar().then(() => {
        if (!activo) return
        const enCurso = Object.values(ordenesRef.current).some(ordenEnCurso)
        programar(enCurso ? SONDEO_EN_CURSO_MS : SONDEO_REPOSO_MS)
      })
    }
    siguienteCiclo.current()
    return () => {
      activo = false
      siguienteCiclo.current = () => undefined
      if (temporizador.current) clearTimeout(temporizador.current)
    }
  }, [cargar, programar])

  const enviar = useCallback(async (sensorId: number, accion: AccionOrden) => {
    setEnviando((e) => ({ ...e, [sensorId]: true }))
    setErrores((e) => ({ ...e, [sensorId]: '' }))
    try {
      aplicarOrdenes([await crearOrden(sensorId, accion)])
      // Adelanta la próxima consulta: la orden acaba de entrar en curso.
      programar(SONDEO_EN_CURSO_MS)
    } catch (err) {
      setErrores((e) => ({
        ...e,
        [sensorId]: mensajeDeError(err, err instanceof Error ? err.message : 'No se pudo enviar la orden.'),
      }))
    } finally {
      setEnviando((e) => ({ ...e, [sensorId]: false }))
    }
  }, [aplicarOrdenes, programar])

  return { ordenes, reles, enviando, errores, errorCarga, enviar }
}
