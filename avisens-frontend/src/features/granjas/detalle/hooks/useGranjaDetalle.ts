import { useEffect, useMemo, useState } from 'react'
import { listarAlertas, type Alerta } from '@features/alertas/api/alertas'
import { listarLotes, type Lote } from '@features/lotes/api/lotes'
import {
  useMonitoreoAmbiental,
  type GalponMonitoreoVista,
} from '@features/monitoreo/hooks/useMonitoreoAmbiental'
import { obtenerGranja, type Granja } from '../../api/granjas'
import { estadoOperativoDeGalpon, resumirGranja, type EstadoOperativo } from '../model/granjaDetalle'

export type GalponDeGranja = GalponMonitoreoVista & {
  estadoOperativo: EstadoOperativo
  alertasAbiertas: number
  lotes: Lote[]
}

// Reúne en una sola forma todo lo que la página de granja necesita.
// El ambiente sale de useMonitoreoAmbiental, que ya es un store compartido:
// entrar aquí no dispara otra ronda de peticiones si el dashboard ya las hizo.
export function useGranjaDetalle(granjaId: number) {
  const monitoreo = useMonitoreoAmbiental()
  const [granja, setGranja] = useState<Granja | null>(null)
  const [lotes, setLotes] = useState<Lote[]>([])
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [cargandoGranja, setCargandoGranja] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!Number.isInteger(granjaId) || granjaId <= 0) {
      setError('La granja indicada no es válida.')
      setCargandoGranja(false)
      return
    }

    let vigente = true
    setCargandoGranja(true)
    setError('')

    void Promise.all([obtenerGranja(granjaId), listarLotes(), listarAlertas()])
      .then(([granjaData, lotesData, alertasData]) => {
        if (!vigente) return
        setGranja(granjaData)
        setLotes(lotesData)
        setAlertas(alertasData)
      })
      .catch(() => {
        if (vigente) setError('No se pudo cargar la granja.')
      })
      .finally(() => {
        if (vigente) setCargandoGranja(false)
      })

    return () => {
      vigente = false
    }
  }, [granjaId])

  const galpones = useMemo<GalponDeGranja[]>(() => {
    const abiertasPorGalpon = new Map<number, number>()
    for (const alerta of alertas) {
      if (alerta.estado === 'cerrada') continue
      abiertasPorGalpon.set(alerta.galpon_id, (abiertasPorGalpon.get(alerta.galpon_id) ?? 0) + 1)
    }

    return monitoreo.galpones
      .filter((galpon) => galpon.granjaId === granjaId)
      .map((galpon) => ({
        ...galpon,
        estadoOperativo: estadoOperativoDeGalpon(galpon.activo, galpon.sensores),
        alertasAbiertas: abiertasPorGalpon.get(galpon.id) ?? 0,
        // Todos los lotes que ha alojado este galpón: el activo y los que ya
        // salieron. El histórico es parte de la ficha del galpón.
        lotes: lotes
          .filter((lote) => lote.galpon.id === galpon.id)
          .sort(
            (a, b) =>
              new Date(b.fecha_ingreso).getTime() - new Date(a.fecha_ingreso).getTime(),
          ),
      }))
  }, [monitoreo.galpones, granjaId, lotes, alertas])

  const resumen = useMemo(
    () =>
      resumirGranja(
        galpones.map((galpon) => ({
          activo: galpon.activo,
          capacidadAves: galpon.capacidadAves,
          loteActivo: galpon.loteActivo
            ? { cantidadInicial: galpon.loteActivo.cantidad_inicial }
            : null,
        })),
        galpones.reduce((total, galpon) => total + galpon.alertasAbiertas, 0),
      ),
    [galpones],
  )

  return {
    granja,
    galpones,
    resumen,
    cargando: cargandoGranja || monitoreo.cargando,
    error: error || monitoreo.error,
    recargar: monitoreo.recargar,
  }
}
