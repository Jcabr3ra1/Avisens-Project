import { useCallback, useEffect, useState } from 'react'
import type { Usuario } from '@shared/api'
import type { Granja } from '@features/granjas/api/granjas'
import type { Prospecto } from '@features/crm/api/prospectos'
import type { Organizacion } from '@features/organizaciones/api/organizaciones'
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
  const [organizaciones, setOrganizaciones] = useState<Organizacion[]>([])
  const [prospectos, setProspectos] = useState<Prospecto[]>([])
  const [cargandoGestion, setCargandoGestion] = useState(true)
  const [cargandoCrm, setCargandoCrm] = useState(true)
  const [atencion, setAtencion] = useState<AtencionAdminData>(ATENCION_INICIAL)
  const [cargandoAtencion, setCargandoAtencion] = useState(true)
  const [errorAtencion, setErrorAtencion] = useState('')
  // Los KPIs de la cabecera se calculan sumando usuarios, granjas y
  // prospectos. Si alguna de esas cargas falla y no se dice, las tarjetas
  // muestran un número menor del real sin que nada lo indique.
  const [errorResumen, setErrorResumen] = useState('')

  const cargarGestion = useCallback(async () => {
    setCargandoGestion(true)
    try {
      const [usuariosData, granjasData, organizacionesData] = await cargarGestionAdmin()
      setUsuarios(usuariosData)
      setGranjas(granjasData)
      setOrganizaciones(organizacionesData)
      setErrorResumen('')
    } catch {
      setErrorResumen('No se pudieron cargar usuarios y granjas, así que los totales de arriba están incompletos.')
    } finally {
      setCargandoGestion(false)
    }
  }, [])

  const cargarProspectos = useCallback(async () => {
    setCargandoCrm(true)
    try {
      setProspectos(await cargarProspectosAdmin())
    } catch {
      setErrorResumen('No se pudieron cargar los prospectos, así que el total comercial está incompleto.')
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
    organizaciones,
    prospectos,
    atencion,
    cargandoGestion,
    cargandoCrm,
    cargandoAtencion,
    errorAtencion,
    errorResumen,
    recargarAtencion: cargarAtencion,
    recargarResumen: async () => {
      await Promise.all([cargarGestion(), cargarProspectos()])
    },
  }
}
