import { useMemo } from 'react'
import type { Usuario } from '@shared/api'
import type { Organizacion } from '@features/organizaciones/api/organizaciones'
import type { Prospecto } from '@features/crm/api/prospectos'
import type { GalponMonitoreoVista } from '@features/monitoreo/hooks/useMonitoreoAmbiental'
import type { AtencionAdminData } from '../api/admin'
import {
  calcularAtencionAdmin,
  calcularConversionCrm,
  calcularEtapasCrmAdmin,
  calcularKpisAdmin,
} from '../model/adminResumen'

type Datos = {
  usuarios: Usuario[]
  organizaciones: Organizacion[]
  prospectos: Prospecto[]
  galpones: GalponMonitoreoVista[]
  atencion: AtencionAdminData
}

export function useResumenAdmin({ usuarios, organizaciones, prospectos, galpones, atencion }: Datos) {
  return useMemo(() => {
    const etapasCrm = calcularEtapasCrmAdmin(prospectos)
    const totalPropietarios = usuarios.filter((usuario) => usuario.rol.nombre === 'Propietario').length
    const actividadReciente = [...usuarios]
      .sort((a, b) => new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime())
      .slice(0, 5)

    return {
      kpis: calcularKpisAdmin(organizaciones, usuarios, calcularAtencionAdmin(atencion), galpones),
      atencion: calcularAtencionAdmin(atencion),
      etapasCrm,
      conversionCrm: calcularConversionCrm(prospectos, etapasCrm),
      actividadReciente,
      totalPropietarios,
      totalOperarios: usuarios.filter((usuario) => usuario.rol.nombre === 'Operario').length,
      totalAdministradores: usuarios.filter((usuario) => usuario.rol.nombre === 'Administrador').length,
      totalActivos: usuarios.filter((usuario) => usuario.activo).length,
    }
  }, [atencion, galpones, organizaciones, prospectos, usuarios])
}
