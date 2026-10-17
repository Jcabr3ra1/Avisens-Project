import { useCallback, useEffect, useState } from 'react'
import { listarGalpones, type Galpon } from '@features/galpones/api/galpones'
import { listarLotes, type Lote } from '@features/lotes/api/lotes'
import { listarLineasGeneticas, type LineaGenetica } from '@features/lotes/api/lineas-geneticas'
import { listarProveedores, type Proveedor } from '@features/proveedores/api/proveedores'

export function useEstructuraOrganizacion(granjaIds: number[]) {
  const [galpones, setGalpones] = useState<Galpon[]>([])
  const [lotes, setLotes] = useState<Lote[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [lineasGeneticas, setLineasGeneticas] = useState<LineaGenetica[]>([])
  const [errorLineas, setErrorLineas] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const clave = [...granjaIds].sort((a, b) => a - b).join(',')

  const recargar = useCallback(async () => {
    const propias = new Set(clave.split(',').filter(Boolean).map(Number))
    setCargando(true)
    setError('')
    try {
      const [listaGalpones, listaLotes] = await Promise.all([listarGalpones(), listarLotes()])
      setGalpones(listaGalpones.filter((galpon) => propias.has(galpon.granja.id)))
      setLotes(listaLotes.filter((lote) => propias.has(lote.galpon.granja.id)))
    } catch {
      setError('No se pudo cargar la estructura de las granjas.')
    } finally {
      setCargando(false)
    }
  }, [clave])

  useEffect(() => { void recargar() }, [recargar])

  useEffect(() => {
    void listarProveedores()
      .then((lista) => setProveedores(lista.filter((proveedor) => proveedor.activo)))
      .catch(() => setProveedores([]))
    void listarLineasGeneticas()
      .then((lista) => { setLineasGeneticas(lista); setErrorLineas('') })
      .catch(() => setErrorLineas('No se pudieron cargar las líneas genéticas.'))
  }, [])

  return { galpones, lotes, proveedores, lineasGeneticas, errorLineas, cargando, error, recargar }
}
