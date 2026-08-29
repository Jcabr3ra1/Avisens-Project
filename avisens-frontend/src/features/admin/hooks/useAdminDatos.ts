import { useCallback, useEffect, useState } from 'react'
import type { Usuario } from '@shared/api'
import type { Granja } from '@features/granjas/api/granjas'
import type { Prospecto } from '@features/crm/api/prospectos'
import { cargarGestionAdmin, cargarProspectosAdmin } from '../api/admin'

export function useAdminDatos() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [granjas, setGranjas] = useState<Granja[]>([])
  const [prospectos, setProspectos] = useState<Prospecto[]>([])
  const [cargandoGestion, setCargandoGestion] = useState(true)
  const [cargandoCrm, setCargandoCrm] = useState(true)

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

  useEffect(() => {
    void cargarGestion()
    void cargarProspectos()
  }, [cargarGestion, cargarProspectos])

  return { usuarios, granjas, prospectos, cargandoGestion, cargandoCrm }
}
