// useControlActuadores.ts — Órdenes y estado actual de los relés de un galpón.
//
// Una orden pasa por pendiente → enviada → aplicada/rechazada/expirada, y
// solo el ESP32 la cierra: el ciclo /ingest es de 5 s y la confirmación
// llega en el ciclo siguiente. La interfaz nunca la da por hecha antes.
//
// Todo sale de una sola consulta (GET /ordenes-actuadores/ultimas), sin
// importar cuántos relés haya: el límite de peticiones es por IP y en la
// granja lo comparten el computador, el móvil y el propio ESP32.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { mensajeDeError } from '@shared/utils/errores'
import {
  crearOrden,
  listarUltimasOrdenes,
  type AccionOrden,
  type OrdenActuador,
} from '../api/ordenesActuadores'
import {
  SIN_ESTADOS,
  aplicarRespuestaEstados,
  estadosVigentes,
  fusionarOrdenes,
  ordenEnCurso,
  proximoVencimiento,
  type EstadosRecibidos,
} from '../model/actuadores'

// Con una orden en curso la respuesta llega en 5-10 s: 4 s la ve pronto sin
// martillar. En reposo basta para notar una reversión o un cambio hecho desde
// otra pantalla.
const SONDEO_EN_CURSO_MS = 4_000
const SONDEO_REPOSO_MS = 20_000

export function useControlActuadores(galponId: number, onOrdenFinalizada: () => void) {
  const [ordenes, setOrdenes] = useState<Record<number, OrdenActuador>>({})
  // Lo que informó la última consulta correcta y cuándo salió esa consulta:
  // la vigencia se recalcula con la hora actual (ver estadosVigentes).
  const [recibidos, setRecibidos] = useState<EstadosRecibidos>(SIN_ESTADOS)
  const [ahora, setAhora] = useState(() => Date.now())
  const [enviando, setEnviando] = useState<Record<number, boolean>>({})
  const [errores, setErrores] = useState<Record<number, string>>({})
  const [errorCarga, setErrorCarga] = useState('')

  // La fuente de verdad de las órdenes vive en un ref para que el sondeo y
  // el envío fusionen sobre lo último, no sobre una copia de un render viejo.
  const ordenesRef = useRef<Record<number, OrdenActuador>>({})
  // El estado de los relés no tiene versión por fila (vigente depende de la
  // hora del servidor): se aplica solo la respuesta de la consulta más nueva.
  const secuencia = useRef(0)
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
    const consultadaEn = Date.now()
    try {
      const respuesta = await listarUltimasOrdenes(galponId)
      const termino = aplicarOrdenes(respuesta.ordenes)
      setRecibidos((previos) =>
        aplicarRespuestaEstados(previos, mia, respuesta.reles, {
          consultadaEn,
          generadoEn: respuesta.generadoEn,
        }),
      )
      setAhora(Date.now())
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

  // Si las consultas fallan, nada vuelve a pintar la pantalla: este
  // temporizador lo hace justo cuando vence el próximo estado, para que pase
  // a "Sin dato reciente" y se bloqueen sus botones a tiempo.
  const reles = useMemo(() => estadosVigentes(recibidos, ahora), [recibidos, ahora])
  useEffect(() => {
    const vence = proximoVencimiento(recibidos, ahora)
    if (vence === null) return
    const espera = setTimeout(() => setAhora(Date.now()), Math.max(0, vence - Date.now()) + 1)
    return () => clearTimeout(espera)
  }, [recibidos, ahora])

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
