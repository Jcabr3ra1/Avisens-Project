import { useCallback, useEffect, useState } from 'react'
import { mensajeDeError } from '@shared/utils/errores'
import {
  activarProveedor,
  actualizarProveedor,
  crearProveedor,
  desactivarProveedor,
  eliminarProveedorPermanente,
  listarProveedores,
} from '../api/proveedores'
import type { ActualizarProveedorPayload, CrearProveedorPayload, Proveedor } from '../model/proveedor'

export function useProveedores() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const recargar = useCallback(async () => {
    setCargando(true)
    setError('')

    try {
      setProveedores(await listarProveedores())
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudieron cargar los proveedores.'))
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void recargar()
  }, [recargar])

  const crear = useCallback(async (datos: CrearProveedorPayload) => {
    const proveedor = await crearProveedor(datos)
    setProveedores((actuales) => [proveedor, ...actuales])
  }, [])

  const actualizar = useCallback(async (id: number, datos: ActualizarProveedorPayload) => {
    const proveedor = await actualizarProveedor(id, datos)
    setProveedores((actuales) => actuales.map((actual) => actual.id === id ? proveedor : actual))
  }, [])

  const alternarActivo = useCallback(async (proveedor: Proveedor) => {
    setError('')

    try {
      if (proveedor.activo) await desactivarProveedor(proveedor.id)
      else await activarProveedor(proveedor.id)

      setProveedores((actuales) => actuales.map((actual) =>
        actual.id === proveedor.id ? { ...actual, activo: !proveedor.activo } : actual,
      ))
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo cambiar el estado del proveedor.'))
    }
  }, [])

  const eliminar = useCallback(async (proveedor: Proveedor) => {
    setError('')

    try {
      await eliminarProveedorPermanente(proveedor.id)
      setProveedores((actuales) => actuales.filter((actual) => actual.id !== proveedor.id))
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo eliminar el proveedor.'))
    }
  }, [])

  return { proveedores, cargando, error, recargar, crear, actualizar, alternarActivo, eliminar }
}
