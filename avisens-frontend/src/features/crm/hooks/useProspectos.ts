import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { listarUsuarios } from '@features/usuarios/api/usuarios'
import type { Usuario } from '@shared/api'
import { mensajeDeError } from '@shared/utils/errores'
import { descargarBlob, nombreConFecha } from '@shared/utils/descargas'
import {
  asignarAsesor,
  exportarProspectosCsv,
  listarTodosLosProspectos,
} from '../api/prospectos'
import { asesoresPosibles } from '../model/asesores'
import { aProspectoVista, type ProspectoVista } from '../model/prospectoVista'

export function useProspectos() {
  const [prospectos, setProspectos] = useState<ProspectoVista[]>([])
  const [asesores, setAsesores] = useState<Usuario[]>([])
  const [cargando, setCargando] = useState(true)
  const [asignandoId, setAsignandoId] = useState<number | null>(null)
  const [exportando, setExportando] = useState(false)
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
      const lista = await listarTodosLosProspectos()
      if (montado.current) setProspectos(lista.map(aProspectoVista))
    } catch {
      if (montado.current) setError('No se pudieron cargar los prospectos.')
    } finally {
      if (montado.current) setCargando(false)
    }

    // Solo administradores. El CRM es el embudo comercial de Avisens: un
    // prospecto es alguien que todavía NO es cliente, así que quien lo atiende
    // es del equipo de Avisens. Un propietario o un operario son clientes, y
    // asignarles un prospecto significaría que un cliente lleva las ventas.
    //
    // No existe un rol 'Asesor': asesor es la función, no el rol. El backend
    // tampoco lo valida —solo comprueba que el usuario esté activo—, así que
    // esto es una ayuda de la interfaz y no una defensa.
    try {
      const usuarios = await listarUsuarios()
      if (montado.current) setAsesores(asesoresPosibles(usuarios))
    } catch {
      if (montado.current) setAsesores([])
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const asignar = useCallback(async (prospectoId: number, asesorId: number) => {
    setAsignandoId(prospectoId)
    try {
      const actualizado = await asignarAsesor(prospectoId, asesorId)
      setProspectos((actuales) => actuales.map((prospecto) => (
        prospecto.id === prospectoId
          ? { ...prospecto, asesorId: actualizado.asesor_asignado_id }
          : prospecto
      )))
      toast.success('Asesor asignado')
      return true
    } catch (problema) {
      toast.error(mensajeDeError(problema, 'No se pudo asignar el asesor.'))
      return false
    } finally {
      if (montado.current) setAsignandoId(null)
    }
  }, [])

  const exportar = useCallback(async () => {
    setExportando(true)
    try {
      const csv = await exportarProspectosCsv()
      descargarBlob(csv, nombreConFecha('prospectos', 'csv'))
      toast.success('Exportación descargada')
    } catch (problema) {
      toast.error(mensajeDeError(problema, 'No se pudo exportar la lista.'))
    } finally {
      if (montado.current) setExportando(false)
    }
  }, [])

  return {
    prospectos, asesores, cargando, asignandoId, exportando, error,
    recargar: cargar, asignar, exportar,
  }
}
