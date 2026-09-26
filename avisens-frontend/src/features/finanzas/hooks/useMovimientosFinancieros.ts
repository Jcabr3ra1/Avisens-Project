import { useCallback, useEffect, useState } from 'react'
import { listarGranjas, type Granja } from '@features/granjas/api/granjas'
import { listarLotes, type Lote } from '@features/lotes/api/lotes'
import {
  actualizarMovimientoFinanciero,
  crearMovimientoFinanciero,
  eliminarMovimientoFinanciero,
  listarCategoriasFinancieras,
  listarMovimientosFinancieros,
  type CategoriaFinanciera,
  type CrearMovimientoFinancieroPayload,
  type MovimientoFinanciero,
} from '../api/movimientos-financieros'

export function useMovimientosFinancieros() {
  const [movimientos, setMovimientos] = useState<MovimientoFinanciero[]>([])
  const [categorias, setCategorias] = useState<CategoriaFinanciera[]>([])
  const [granjas, setGranjas] = useState<Granja[]>([])
  const [lotes, setLotes] = useState<Lote[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const recargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const lista = await listarMovimientosFinancieros()
      setMovimientos(lista)
      // Las categorías se piden con las ya vistas como respaldo, por si el
      // backend todavía no expone su listado.
      setCategorias(
        await listarCategoriasFinancieras(lista.map((movimiento) => movimiento.categoria)),
      )
    } catch {
      setError('No se pudieron cargar los movimientos financieros. Inténtalo nuevamente.')
    } finally {
      setCargando(false)
    }

    // Granjas y lotes solo alimentan los desplegables del formulario: si fallan,
    // la tabla se sigue viendo en lugar de caerse la página entera.
    void listarGranjas().then(setGranjas).catch(() => setGranjas([]))
    void listarLotes().then(setLotes).catch(() => setLotes([]))
  }, [])

  useEffect(() => { void recargar() }, [recargar])

  const crear = useCallback(async (payload: CrearMovimientoFinancieroPayload) => {
    const creado = await crearMovimientoFinanciero(payload)
    await recargar()
    return creado
  }, [recargar])

  const actualizar = useCallback(async (
    id: number,
    payload: CrearMovimientoFinancieroPayload,
  ) => {
    const actualizado = await actualizarMovimientoFinanciero(id, payload)
    await recargar()
    return actualizado
  }, [recargar])

  const eliminar = useCallback(async (id: number) => {
    await eliminarMovimientoFinanciero(id)
    setMovimientos((actuales) => actuales.filter((movimiento) => movimiento.id !== id))
  }, [])

  return {
    movimientos, categorias, granjas, lotes,
    cargando, error, recargar, crear, actualizar, eliminar,
  }
}
