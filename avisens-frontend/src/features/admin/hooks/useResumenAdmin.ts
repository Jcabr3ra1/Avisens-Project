import { useMemo } from 'react'
import type { Usuario } from '@shared/api'
import type { Granja } from '@features/granjas/api/granjas'
import type { Prospecto } from '@features/crm/api/prospectos'
import type { GalponMonitoreoVista } from '@features/monitoreo/hooks/useMonitoreoAmbiental'
import {
  calcularConversionCrm,
  calcularEtapasCrmAdmin,
  calcularKpisAdmin,
} from '../model/adminResumen'

type Datos = {
  usuarios: Usuario[]
  granjas: Granja[]
  prospectos: Prospecto[]
  galpones: GalponMonitoreoVista[]
}

export function useResumenAdmin({ usuarios, granjas, prospectos, galpones }: Datos) {
  return useMemo(() => {
    const etapasCrm = calcularEtapasCrmAdmin(prospectos)
    const totalPropietarios = usuarios.filter((usuario) => usuario.rol.nombre === 'Propietario').length
    const actividadReciente = [...usuarios]
      .sort((a, b) => new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime())
      .slice(0, 5)

    return {
      kpis: calcularKpisAdmin(granjas, galpones),
      etapasCrm,
      conversionCrm: calcularConversionCrm(prospectos, etapasCrm),
      actividadReciente,
      totalPropietarios,
      totalOperarios: usuarios.filter((usuario) => usuario.rol.nombre === 'Operario').length,
      totalActivos: usuarios.filter((usuario) => usuario.activo).length,
    }
  }, [galpones, granjas, prospectos, usuarios])
}
