import { useCallback, useEffect, useState } from 'react'
import { listarInsumos, type Insumo } from '@features/inventario/api/insumos'
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

  // La clave de idempotencia la pone quien llama, no este hook: agregar un
  // repuesto descuenta stock, y para que el backend reconozca un reintento la
  // clave tiene que ser la MISMA en los dos envíos. Generándola aquí dentro
  // cambiaba en cada llamada y esa protección nunca llegaba a actuar.
  const agregar = useCallback(
    async (
      insumoId: number,
      cantidad: number,
      claveIdempotencia: string,
      descripcion?: string,
    ) => {
      const creado = await agregarRepuesto(mantenimientoId, {
        insumo_id: insumoId,
        cantidad,
        clave_idempotencia: claveIdempotencia,
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
