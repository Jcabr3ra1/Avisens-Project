import { useEffect, useState } from 'react'
import { listarMediciones } from '@features/sensores/api/mediciones'
import { aSerie, desdeHace24h, resumirSerie, type PuntoSerie, type ResumenSerie } from '../model/metricas'

export function useSerieSensor(sensorId: number | null) {
  const [serie, setSerie] = useState<PuntoSerie[]>([])
  const [resumen, setResumen] = useState<ResumenSerie>({ minimo: null, promedio: null, maximo: null })
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (sensorId === null) {
      setSerie([])
      setResumen({ minimo: null, promedio: null, maximo: null })
      setCargando(false)
      return
    }

    let vigente = true
    setCargando(true)

    // 200 lecturas cubren un día completo aunque el ESP32 reporte cada 7 min.
    listarMediciones({ sensor_id: sensorId, desde: desdeHace24h(), limit: 200 })
      .then((mediciones) => {
        if (!vigente) return
        const puntos = aSerie(mediciones)
        setSerie(puntos)
        setResumen(resumirSerie(puntos))
      })
      .catch(() => {
        if (!vigente) return
        setSerie([])
        setResumen({ minimo: null, promedio: null, maximo: null })
      })
      .finally(() => { if (vigente) setCargando(false) })

    return () => { vigente = false }
  }, [sensorId])

  return { serie, resumen, cargando }
}
