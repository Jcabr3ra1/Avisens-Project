import { useCallback, useEffect, useState } from 'react'
import type { Usuario } from '@shared/api'
import type { Granja } from '@features/granjas/api/granjas'
import type { Prospecto } from '@features/crm/api/prospectos'
import {
  cargarAtencionAdmin,
  cargarGestionAdmin,
  cargarProspectosAdmin,
  type AtencionAdminData,
} from '../api/admin'

const ATENCION_INICIAL: AtencionAdminData = {
  alertas: [],
  solicitudes: [],
  recuperaciones: [],
}

export function useAdminDatos() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [granjas, setGranjas] = useState<Granja[]>([])
  const [prospectos, setProspectos] = useState<Prospecto[]>([])
  const [cargandoGestion, setCargandoGestion] = useState(true)
  const [cargandoCrm, setCargandoCrm] = useState(true)
  const [atencion, setAtencion] = useState<AtencionAdminData>(ATENCION_INICIAL)
  const [cargandoAtencion, setCargandoAtencion] = useState(true)
  const [errorAtencion, setErrorAtencion] = useState('')

  const cargarGestion = useCallback(async () => {
    setCargandoGestion(true)
    try {
      const [usuariosData, granjasData] = await cargarGestionAdmin()
      setUsuarios(usuariosData)
      setGranjas(granjasData)
    } catch {
      return
    } finally {
      setCargandoGestion(false)
    }
  }, [])

  const cargarProspectos = useCallback(async () => {
    setCargandoCrm(true)
    try {
      const { data } = await cargarProspectosAdmin()
      setProspectos(data)
    } catch {
      return
    } finally {
      setCargandoCrm(false)
    }
  }, [])

  const cargarAtencion = useCallback(async () => {
    setCargandoAtencion(true)
    setErrorAtencion('')
    try {
      setAtencion(await cargarAtencionAdmin())
    } catch {
      setErrorAtencion('No se pudo cargar la bandeja de atención.')
    } finally {
      setCargandoAtencion(false)
    }
  }, [])

  useEffect(() => {
    void cargarGestion()
    void cargarProspectos()
    void cargarAtencion()
  }, [cargarAtencion, cargarGestion, cargarProspectos])

  return {
    usuarios,
    granjas,
    prospectos,
    atencion,
    cargandoGestion,
    cargandoCrm,
    cargandoAtencion,
    errorAtencion,
    recargarAtencion: cargarAtencion,
  }
}
