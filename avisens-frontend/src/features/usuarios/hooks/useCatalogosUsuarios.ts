import { useCallback, useEffect, useRef, useState } from 'react'
import {
  listarOrganizaciones,
  listarRolesUsuario,
  type Organizacion,
  type RolResumen,
} from '@shared/api'
import { mensajeDeError } from '@shared/utils/errores'

export function useCatalogosUsuarios(esPropietario: boolean) {
  const [roles, setRoles] = useState<RolResumen[]>([])
  const [organizaciones, setOrganizaciones] = useState<Organizacion[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const montado = useRef(true)

  useEffect(() => {
    montado.current = true
    return () => {
      montado.current = false
    }
  }, [])

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')

    try {
      const [rolesDisponibles, organizacionesDisponibles] = await Promise.all([
        listarRolesUsuario(),
        esPropietario ? Promise.resolve([]) : listarOrganizaciones(),
      ])
      if (montado.current) {
        setRoles(rolesDisponibles)
        setOrganizaciones(organizacionesDisponibles.filter((organizacion) => organizacion.activa))
      }
      return rolesDisponibles
    } catch (err) {
      if (montado.current) {
        setError(mensajeDeError(err, 'No se pudieron cargar los datos del formulario.'))
      }
      return []
    } finally {
      if (montado.current) setCargando(false)
    }
  }, [esPropietario])

  return { roles, organizaciones, cargando, error, recargar: cargar }
}
