import { useEffect, useState } from 'react'
import { listarTodasLasMediciones } from '@features/sensores/api/mediciones'
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

    // El rango acota el volumen; el cliente trae todas las páginas que haga
    // falta. Antes se pedía limit: 200 y el backend lo rechazaba con 400, así
    // que la gráfica quedaba vacía sin decir por qué.
    listarTodasLasMediciones({ sensor_id: sensorId, desde: desdeHace24h() })
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
