import { useCallback, useEffect, useMemo, useState } from 'react'
import { listarAlertas, type Alerta } from '@features/alertas/api/alertas'
import {
  listarConsumosDiarios,
  type ConsumoDiario,
} from '@features/consumos-diarios/api/consumosDiarios'
import { listarLotes, type Lote } from '@features/lotes/api/lotes'
import { listarProveedores, type Proveedor } from '@features/proveedores/api/proveedores'
import {
  useMonitoreoAmbiental,
  type GalponMonitoreoVista,
} from '@features/monitoreo/hooks/useMonitoreoAmbiental'
import { listarGranjas, type Granja } from '../api/granjas'
import { estadoOperativoDeGalpon, type EstadoOperativo } from '../model/estructura'

export type GalponConLotes = GalponMonitoreoVista & {
  estadoOperativo: EstadoOperativo
  alertasAbiertas: number
  loteEnCurso: Lote | null
  lotes: Lote[]
}

export type GranjaConEstructura = {
  granja: Granja
  galpones: GalponConLotes[]
  lotesActivos: number
  avesAlojadas: number
  alertasAbiertas: number
}

// Toda la estructura productiva en una sola carga.
//
// El ambiente sale de useMonitoreoAmbiental, que es un store compartido: si
// el dashboard ya pidió sensores y mediciones, entrar aquí no vuelve a
// pedirlos. Lo demás (granjas, lotes, alertas, consumos, proveedores) se
// trae una vez y se reparte en memoria, en vez de que cada galpón dispare
// su propia petición.
export function useEstructuraGranjas() {
  const monitoreo = useMonitoreoAmbiental()
  const [granjas, setGranjas] = useState<Granja[]>([])
  const [lotes, setLotes] = useState<Lote[]>([])
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [consumos, setConsumos] = useState<ConsumoDiario[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const recargarDatos = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      // Las cuatro primeras son el núcleo; sin ellas la página no existe.
      const [granjasData, lotesData, alertasData] = await Promise.all([
        listarGranjas(),
        listarLotes(),
        listarAlertas(),
      ])
      setGranjas(granjasData)
      setLotes(lotesData)
      setAlertas(alertasData)
    } catch {
      setError('No se pudo cargar la estructura de tus granjas.')
    } finally {
      setCargando(false)
    }

    // Consumos y proveedores son de apoyo: si fallan, la página sigue
    // funcionando sin ese dato en lugar de caerse entera.
    void listarConsumosDiarios().then(setConsumos).catch(() => setConsumos([]))
    void listarProveedores()
      .then((lista) => setProveedores(lista.filter((proveedor) => proveedor.activo)))
      .catch(() => setProveedores([]))
  }, [])

  useEffect(() => {
    void recargarDatos()
  }, [recargarDatos])

  const recargar = useCallback(async () => {
    await Promise.all([recargarDatos(), monitoreo.recargar()])
  }, [recargarDatos, monitoreo])

  const estructura = useMemo<GranjaConEstructura[]>(() => {
    const abiertasPorGalpon = new Map<number, number>()
    for (const alerta of alertas) {
      if (alerta.estado === 'cerrada') continue
      abiertasPorGalpon.set(alerta.galpon_id, (abiertasPorGalpon.get(alerta.galpon_id) ?? 0) + 1)
    }

    const lotesPorGalpon = new Map<number, Lote[]>()
    for (const lote of lotes) {
      const actuales = lotesPorGalpon.get(lote.galpon.id)
      if (actuales) actuales.push(lote)
      else lotesPorGalpon.set(lote.galpon.id, [lote])
    }

    return granjas.map((granja) => {
      const galpones: GalponConLotes[] = monitoreo.galpones
        .filter((galpon) => galpon.granjaId === granja.id)
        .map((galpon) => {
          // Más reciente primero: el lote en curso encabeza y el histórico
          // queda debajo, que es como se lee una ficha de galpón.
          const suyos = [...(lotesPorGalpon.get(galpon.id) ?? [])].sort(
            (a, b) =>
              new Date(b.fecha_ingreso).getTime() - new Date(a.fecha_ingreso).getTime(),
          )
          return {
            ...galpon,
            estadoOperativo: estadoOperativoDeGalpon(galpon.activo, galpon.sensores),
            alertasAbiertas: abiertasPorGalpon.get(galpon.id) ?? 0,
            loteEnCurso: suyos.find((lote) => lote.estado === 'activo') ?? null,
            lotes: suyos,
          }
        })

      return {
        granja,
        galpones,
        lotesActivos: galpones.filter((galpon) => galpon.loteEnCurso !== null).length,
        avesAlojadas: galpones.reduce(
          (total, galpon) => total + (galpon.loteEnCurso?.cantidad_inicial ?? 0),
          0,
        ),
        alertasAbiertas: galpones.reduce((total, galpon) => total + galpon.alertasAbiertas, 0),
      }
    })
  }, [granjas, monitoreo.galpones, lotes, alertas])

  // Consumo acumulado por lote, ya agrupado: evita que cada tarjeta de lote
  // recorra la lista completa por su cuenta.
  const consumoPorLote = useMemo(() => {
    const mapa = new Map<number, { alimentoKg: number; aguaLitros: number }>()
    for (const consumo of consumos) {
      const previo = mapa.get(consumo.lote_id) ?? { alimentoKg: 0, aguaLitros: 0 }
      mapa.set(consumo.lote_id, {
        alimentoKg: previo.alimentoKg + (consumo.alimento_kg ?? 0),
        aguaLitros: previo.aguaLitros + (consumo.agua_litros ?? 0),
      })
    }
    return mapa
  }, [consumos])

  return {
    estructura,
    proveedores,
    consumoPorLote,
    cargando: cargando || monitoreo.cargando,
    error: error || monitoreo.error,
    recargar,
    recargarDatos,
  }
}
