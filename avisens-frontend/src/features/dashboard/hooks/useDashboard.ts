import { useCallback, useEffect, useMemo, useState } from 'react'
import { isAxiosError } from 'axios'
import { getUsuario } from '@shared/api'
import { ROL_PROPIETARIO } from '@shared/auth/permisos'
import { obtenerResumenCrecimiento, type ResumenCrecimiento } from '@features/indicadores/api/indicadores'
import { cargarFuentesDashboard, obtenerIndicadorReciente } from '../api/dashboard'
import {
  calcularDiaLote,
  ordenarAlertas,
  type DashboardFuentes,
  type DashboardIndicador,
} from '../model/dashboard'

const fuentesIniciales: DashboardFuentes = {
  granjas: [],
  galpones: [],
  lotes: [],
  alertas: [],
}

function obtenerMensajeError(error: unknown): string {
  if (isAxiosError(error) && error.response?.status === 403) {
    return 'No tienes permisos para consultar este resumen.'
  }
  return 'No pudimos cargar el resumen. Revisa tu conexión e inténtalo de nuevo.'
}

export function useDashboard() {
  const usuario = getUsuario()
  const [fuentes, setFuentes] = useState<DashboardFuentes>(fuentesIniciales)
  const [granjaId, setGranjaId] = useState<number | null>(null)
  const [galponId, setGalponId] = useState<number | null>(null)
  const [indicador, setIndicador] = useState<DashboardIndicador | null>(null)
  const [cargando, setCargando] = useState(true)
  const [cargandoIndicador, setCargandoIndicador] = useState(false)
  const [error, setError] = useState('')
  const [actualizadoEn, setActualizadoEn] = useState<Date | null>(null)
  const [resumenCrecimiento, setResumenCrecimiento] = useState<ResumenCrecimiento | null>(null)
  const [cargandoResumenCrecimiento, setCargandoResumenCrecimiento] = useState(false)
  const [errorCrecimiento, setErrorCrecimiento] = useState('')
  const [revisionCrecimiento, setRevisionCrecimiento] = useState(0)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const datos = await cargarFuentesDashboard()
      setFuentes(datos)
      setActualizadoEn(new Date())
      setGranjaId((actual) => {
        if (actual !== null && datos.granjas.some((granja) => granja.id === actual)) return actual
        const conGalponActivo = datos.granjas.find((granja) =>
          granja.activa && datos.galpones.some((galpon) => galpon.granjaId === granja.id && galpon.activo),
        )
        const conGalpon = datos.granjas.find((granja) =>
          datos.galpones.some((galpon) => galpon.granjaId === granja.id),
        )
        return conGalponActivo?.id ?? conGalpon?.id ?? datos.granjas[0]?.id ?? null
      })
    } catch (fallo) {
      setError(obtenerMensajeError(fallo))
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const galpones = useMemo(
    () => fuentes.galpones.filter((galpon) => galpon.granjaId === granjaId),
    [fuentes.galpones, granjaId],
  )

  useEffect(() => {
    setGalponId((actual) => {
      if (actual !== null && galpones.some((galpon) => galpon.id === actual)) return actual
      return galpones.find((galpon) => galpon.activo)?.id ?? galpones[0]?.id ?? null
    })
  }, [galpones])

  useEffect(() => {
    let vigente = true
    setResumenCrecimiento(null)
    setErrorCrecimiento('')
    if (usuario?.rol !== ROL_PROPIETARIO || granjaId === null) {
      setCargandoResumenCrecimiento(false)
      return () => { vigente = false }
    }
    setCargandoResumenCrecimiento(true)
    obtenerResumenCrecimiento(granjaId)
      .then((resumen) => { if (vigente) setResumenCrecimiento(resumen) })
      .catch((fallo) => { if (vigente) setErrorCrecimiento(obtenerMensajeError(fallo)) })
      .finally(() => { if (vigente) setCargandoResumenCrecimiento(false) })
    return () => { vigente = false }
  }, [granjaId, usuario?.rol, revisionCrecimiento])

  const lote = useMemo(
    () => fuentes.lotes.find((item) => item.galponId === galponId && item.estado === 'activo') ?? null,
    [fuentes.lotes, galponId],
  )

  useEffect(() => {
    let vigente = true
    setIndicador(null)

    if (!lote) {
      setCargandoIndicador(false)
      return () => { vigente = false }
    }

    setCargandoIndicador(true)
    obtenerIndicadorReciente(lote.id)
      .then((dato) => {
        if (vigente) setIndicador(dato)
      })
      .catch(() => {
        if (vigente) setIndicador(null)
      })
      .finally(() => {
        if (vigente) setCargandoIndicador(false)
      })

    return () => { vigente = false }
  }, [lote])

  const alertasGranja = useMemo(() => {
    const ids = new Set(galpones.map((galpon) => galpon.id))
    return ordenarAlertas(
      fuentes.alertas.filter((alerta) => ids.has(alerta.galponId) && alerta.estado !== 'cerrada'),
    )
  }, [fuentes.alertas, galpones])

  const granja = fuentes.granjas.find((item) => item.id === granjaId) ?? null
  const galpon = galpones.find((item) => item.id === galponId) ?? null

  return {
    usuario,
    granjas: fuentes.granjas,
    lotes: fuentes.lotes,
    totalGalpones: fuentes.galpones.length,
    galpones,
    granja,
    galpon,
    lote,
    indicador,
    alertasGranja,
    resumenCrecimiento,
    cargandoResumenCrecimiento,
    errorCrecimiento,
    recargarCrecimiento: () => setRevisionCrecimiento((actual) => actual + 1),
    diaLote: lote ? indicador?.diaVida ?? calcularDiaLote(lote.fechaIngreso) : null,
    granjaId,
    galponId,
    cargando,
    cargandoIndicador,
    error,
    actualizadoEn,
    seleccionarGranja: setGranjaId,
    seleccionarGalpon: setGalponId,
    recargar: cargar,
  }
}
