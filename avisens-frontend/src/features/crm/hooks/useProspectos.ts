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

    // Los asesores solo llenan el desplegable de asignación: si fallan, la
    // tabla se sigue viendo en lugar de caerse la página entera.
    try {
      const usuarios = await listarUsuarios()
      if (montado.current) setAsesores(usuarios.filter((usuario) => usuario.activo))
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
