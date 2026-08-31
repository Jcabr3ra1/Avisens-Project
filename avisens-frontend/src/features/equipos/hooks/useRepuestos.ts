import { useCallback, useEffect, useState } from 'react'
import { listarInsumos, type Insumo } from '@shared/api'
import { mensajeDeError } from '@shared/utils/errores'
import {
  agregarRepuesto,
  listarRepuestosDeMantenimiento,
  revertirRepuesto,
  type MantenimientoRepuesto,
} from '../api/mantenimientos'

export function useRepuestos(mantenimientoId: number) {
  const [repuestos, setRepuestos] = useState<MantenimientoRepuesto[]>([])
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const [lista, catalogo] = await Promise.all([
        listarRepuestosDeMantenimiento(mantenimientoId),
        listarInsumos(),
      ])
      setRepuestos(lista)
      setInsumos(catalogo.filter((insumo) => insumo.activo))
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudieron cargar los repuestos.'))
    } finally {
      setCargando(false)
    }
  }, [mantenimientoId])

  useEffect(() => {
    void cargar()
  }, [cargar])

  // La clave de idempotencia la exige el backend: agregar un repuesto descuenta
  // stock de bodega, y sin ella un doble clic lo descontaría dos veces.
  const agregar = useCallback(
    async (insumoId: number, cantidad: number, descripcion?: string) => {
      const creado = await agregarRepuesto(mantenimientoId, {
        insumo_id: insumoId,
        cantidad,
        clave_idempotencia: crypto.randomUUID(),
        descripcion,
      })
      setRepuestos((actuales) => [...actuales, creado])
      return creado
    },
    [mantenimientoId],
  )

  const revertir = useCallback(
    async (repuestoId: number) => {
      const revertido = await revertirRepuesto(mantenimientoId, repuestoId)
      setRepuestos((actuales) =>
        actuales.map((actual) => (actual.id === repuestoId ? revertido : actual)),
      )
      return revertido
    },
    [mantenimientoId],
  )

  return { repuestos, insumos, cargando, error, agregar, revertir, recargar: cargar }
}
