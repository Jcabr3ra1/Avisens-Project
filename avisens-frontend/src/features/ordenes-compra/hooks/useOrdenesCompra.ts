import { useCallback, useEffect, useState } from 'react'
import { listarGranjas, type Granja } from '@features/granjas/api/granjas'
import { listarLotes, type Lote } from '@features/lotes/api/lotes'
import { listarInsumos, type Insumo } from '@features/inventario/api/insumos'
import { mensajeDeError } from '@shared/utils/errores'
import { listarProveedores, type Proveedor } from '@features/proveedores/api/proveedores'
import {
  actualizarOrdenCompra,
  agregarDetalleOrden,
  crearOrdenCompra,
  eliminarDetalleOrden,
  obtenerOrdenCompra,
  listarOrdenesCompra,
  recibirOrdenCompra,
} from '../api/ordenesCompra'
import type { CrearDetalleOrdenPayload, CrearOrdenCompraPayload, OrdenCompra, RecibirOrdenPayload } from '../model/ordenCompra'

export function useOrdenesCompra() {
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([])
  const [granjas, setGranjas] = useState<Granja[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [lotes, setLotes] = useState<Lote[]>([])
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const recargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const [ordenesData, granjasData, proveedoresData, lotesData, insumosData] = await Promise.all([
        listarOrdenesCompra(), listarGranjas(), listarProveedores(), listarLotes(), listarInsumos(),
      ])
      setOrdenes(ordenesData)
      setGranjas(granjasData.filter((granja) => granja.activa))
      setProveedores(proveedoresData.filter((proveedor) => proveedor.activo))
      setLotes(lotesData.filter((lote) => lote.estado === 'activo'))
      setInsumos(insumosData.filter((insumo) => insumo.activo))
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudieron cargar las órdenes de compra.'))
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { void recargar() }, [recargar])

  const actualizarEnLista = useCallback((orden: OrdenCompra) => {
    setOrdenes((actuales) => actuales.some((actual) => actual.id === orden.id)
      ? actuales.map((actual) => actual.id === orden.id ? orden : actual)
      : [orden, ...actuales])
  }, [])

  const refrescarOrden = useCallback(async (id: number) => {
    const orden = await obtenerOrdenCompra(id)
    actualizarEnLista(orden)
    return orden
  }, [actualizarEnLista])

  const crear = useCallback(async (payload: CrearOrdenCompraPayload) => {
    const orden = await crearOrdenCompra(payload)
    actualizarEnLista(orden)
    return orden
  }, [actualizarEnLista])

  const agregarDetalle = useCallback(async (id: number, payload: CrearDetalleOrdenPayload) => {
    await agregarDetalleOrden(id, payload)
    return refrescarOrden(id)
  }, [refrescarOrden])

  const eliminarDetalle = useCallback(async (id: number, detalleId: number) => {
    await eliminarDetalleOrden(id, detalleId)
    return refrescarOrden(id)
  }, [refrescarOrden])

  const recibir = useCallback(async (id: number, payload: RecibirOrdenPayload) => {
    await recibirOrdenCompra(id, payload)
    return refrescarOrden(id)
  }, [refrescarOrden])

  const cancelar = useCallback(async (id: number) => {
    const orden = await actualizarOrdenCompra(id, { estado: 'cancelada' })
    actualizarEnLista(orden)
    return orden
  }, [actualizarEnLista])

  return { ordenes, granjas, proveedores, lotes, insumos, cargando, error, recargar, crear, agregarDetalle, eliminarDetalle, recibir, cancelar }
}
