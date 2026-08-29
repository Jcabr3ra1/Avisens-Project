import { useCallback, useState } from 'react'
import type { Usuario } from '@shared/api'
import { listarGalpones, type Galpon } from '@features/galpones/api/galpones'
import { mensajeDeError } from '@shared/utils/errores'
import {
  asignarGalpon,
  listarAsignacionesGalpon,
  retirarGalpon,
  type AsignacionGalpon,
} from '../api/asignacionesGalpon'

export function useAsignacionesGalpon() {
  const [abierto, setAbierto] = useState(false)
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [asignaciones, setAsignaciones] = useState<AsignacionGalpon[]>([])
  const [galpones, setGalpones] = useState<Galpon[]>([])
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const abrir = useCallback(async (usuarioSeleccionado: Usuario) => {
    setUsuario(usuarioSeleccionado)
    setAbierto(true)
    setCargando(true)
    setError('')

    try {
      const [asignacionesActuales, galponesDisponibles] = await Promise.all([
        listarAsignacionesGalpon(usuarioSeleccionado.id),
        listarGalpones(),
      ])
      setAsignaciones(asignacionesActuales)
      setGalpones(galponesDisponibles)
    } catch (err) {
      setError(mensajeDeError(err, 'No fue posible cargar los galpones del operario.'))
    } finally {
      setCargando(false)
    }
  }, [])

  const cerrar = useCallback(() => {
    if (guardando) return
    setAbierto(false)
    setUsuario(null)
    setAsignaciones([])
    setGalpones([])
    setError('')
  }, [guardando])

  const asignar = useCallback(async (galponId: number, rolAsignacion: string) => {
    if (!usuario) return

    setGuardando(true)
    setError('')

    try {
      const asignacion = await asignarGalpon(usuario.id, galponId, rolAsignacion.trim() || undefined)
      setAsignaciones((actuales) => {
        const existe = actuales.some((item) => item.galpon_id === asignacion.galpon_id)
        return existe
          ? actuales.map((item) => item.galpon_id === asignacion.galpon_id ? asignacion : item)
          : [asignacion, ...actuales]
      })
    } catch (err) {
      setError(mensajeDeError(err, 'No fue posible asignar el galpón.'))
      throw err
    } finally {
      setGuardando(false)
    }
  }, [usuario])

  const retirar = useCallback(async (galponId: number) => {
    if (!usuario) return

    setGuardando(true)
    setError('')

    try {
      await retirarGalpon(usuario.id, galponId)
      setAsignaciones((actuales) => actuales.map((item) => (
        item.galpon_id === galponId ? { ...item, activa: false } : item
      )))
    } catch (err) {
      setError(mensajeDeError(err, 'No fue posible retirar el galpón.'))
    } finally {
      setGuardando(false)
    }
  }, [usuario])

  return {
    abierto,
    usuario,
    asignaciones,
    galpones,
    cargando,
    guardando,
    error,
    abrir,
    cerrar,
    asignar,
    retirar,
  }
}
