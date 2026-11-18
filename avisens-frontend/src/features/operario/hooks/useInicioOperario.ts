import { useMemo } from 'react'
import { useDashboard } from '@features/dashboard/hooks/useDashboard'
import { useIndicadoresLote } from '@features/dashboard/hooks/useIndicadoresLote'
import { sensoresDeEscena } from '@features/dashboard/model/escenaGalpon'
import { estadoGranja } from '@features/dashboard/model/estadoGranja'
import {
  filasGalpones,
  itemsAtencionGranja,
  kpisGranja,
  lotesActivosDe,
} from '@features/dashboard/model/resumenGranja'
import { useClimaVisual } from '@features/granjas/propietario/useClimaVisual'
import { tieneLecturaUtil, useMonitoreoAmbiental } from '@features/monitoreo/hooks/useMonitoreoAmbiental'

// Los mismos datos del resumen del propietario (hero, pendientes, galpón 3D y
// lote), pero de los galpones asignados al operario: el backend ya los acota
// por rol. El resumen de crecimiento de la granja lo pide solo el propietario
// (useDashboard lo omite para los demás roles).
export function useInicioOperario() {
  const dashboard = useDashboard()
  const clima = useClimaVisual(dashboard.granjaId)
  const { galpones: monitoreo, cargando: cargandoMonitoreo } = useMonitoreoAmbiental()
  const { indicadores, comparacion, cargando: cargandoLote } = useIndicadoresLote(dashboard.lote?.id ?? null)

  const monitoreoGranja = useMemo(
    () => monitoreo.filter((galpon) => galpon.granjaId === dashboard.granjaId),
    [monitoreo, dashboard.granjaId],
  )
  const galponMonitoreo = monitoreoGranja.find((item) => item.id === dashboard.galponId) ?? null
  const sensoresDelGalpon = useMemo(
    () => (galponMonitoreo?.sensores ?? []).filter((sensor) => !sensor.esEstado),
    [galponMonitoreo],
  )

  const kpis = useMemo(() => kpisGranja({
    galpones: dashboard.galpones,
    lotes: dashboard.lotes,
    alertas: dashboard.alertasGranja,
    sensores: monitoreoGranja.flatMap((galpon) => galpon.sensores),
  }), [dashboard.galpones, dashboard.lotes, dashboard.alertasGranja, monitoreoGranja])

  const atencion = useMemo(() => itemsAtencionGranja({
    alertas: dashboard.alertasGranja,
    galpones: dashboard.galpones,
    monitoreo: monitoreoGranja,
    riesgosCrecimiento: [],
  }), [dashboard.alertasGranja, dashboard.galpones, monitoreoGranja])

  const filas = useMemo(() => filasGalpones({
    galpones: dashboard.galpones,
    lotes: dashboard.lotes,
    alertas: dashboard.alertasGranja,
    monitoreo: monitoreoGranja,
  }), [dashboard.galpones, dashboard.lotes, dashboard.alertasGranja, monitoreoGranja])

  const sensoresEscena = useMemo(() => sensoresDeEscena(sensoresDelGalpon.map((sensor) => ({
    id: sensor.id,
    codigo: sensor.codigo,
    tipo: sensor.tipo,
    valor: sensor.valor,
    unidad: sensor.unidad,
    estado: sensor.estado,
    ultimaLecturaTs: sensor.ultimaLecturaTs,
    minUmbral: sensor.minUmbral,
    maxUmbral: sensor.maxUmbral,
  }))), [sensoresDelGalpon])

  const lotesActivos = lotesActivosDe(dashboard.galpones, dashboard.lotes)
  const sensoresGranja = cargandoMonitoreo
    ? undefined
    : monitoreoGranja.flatMap((galpon) => galpon.sensores).filter((sensor) => !sensor.esEstado).length

  return {
    dashboard,
    clima,
    kpis,
    atencion,
    filas,
    sensoresEscena,
    sensoresDelGalpon: sensoresDelGalpon.length,
    reportando: sensoresDelGalpon.filter((sensor) => tieneLecturaUtil(sensor.estado)).length,
    sensoresGranja,
    estado: estadoGranja({ atencion, filas, sensores: sensoresGranja }),
    avesAlojadas: lotesActivos.reduce((total, lote) => total + lote.cantidadInicial, 0),
    diaUnico: lotesActivos.length === 1 ? dashboard.diaLote : null,
    indicadores,
    comparacion,
    cargandoLote,
    cargandoMonitoreo,
  }
}
