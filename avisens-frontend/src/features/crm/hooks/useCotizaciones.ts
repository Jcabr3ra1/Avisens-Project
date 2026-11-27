import { useCallback, useEffect, useState } from 'react'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import {
  generarCotizacion,
  listarCotizaciones,
  type Cotizacion,
} from '../api/cotizaciones'
import { pesos } from '../model/formato'

export function useCotizaciones(prospectoId: number | null) {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([])
  const [cargando, setCargando] = useState(false)
  const [generando, setGenerando] = useState(false)

  const cargar = useCallback(async () => {
    if (prospectoId === null) return
    setCargando(true)
    try {
      setCotizaciones(await listarCotizaciones(prospectoId))
    } catch {
      toast.error('No se pudieron cargar las cotizaciones del prospecto')
    } finally {
      setCargando(false)
    }
  }, [prospectoId])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const generar = useCallback(async (): Promise<boolean> => {
    if (prospectoId === null) return false
    setGenerando(true)
    try {
      const respuesta = await generarCotizacion(prospectoId)
      toast.success(`Cotización ${respuesta.codigo} generada`, {
        description: `Plan ${respuesta.plan_recomendado} · Total ${pesos(respuesta.valor_total_cop)}`,
      })
      await cargar()
      return true
    } catch (error) {
      const detalle =
        isAxiosError(error) && typeof error.response?.data?.message === 'string'
          ? error.response.data.message
          : 'Inténtalo de nuevo en unos segundos.'
      toast.error('No se pudo generar la cotización', { description: detalle })
      return false
    } finally {
      setGenerando(false)
    }
  }, [prospectoId, cargar])

  return { cotizaciones, cargando, generando, generar }
}
