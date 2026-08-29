import { useState, type FormEvent } from 'react'
import {
  FORMULARIO_PROVEEDOR_INICIAL,
  proveedorAFormulario,
  type FormularioProveedor,
  type Proveedor,
} from '../model/proveedor'

type GuardarProveedor = (datos: FormularioProveedor, editandoId: number | null) => Promise<void>

export function useFormularioProveedor(guardarProveedor: GuardarProveedor) {
  const [abierto, setAbierto] = useState(false)
  const [form, setForm] = useState<FormularioProveedor>(FORMULARIO_PROVEEDOR_INICIAL)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const abrirCrear = () => {
    setForm(FORMULARIO_PROVEEDOR_INICIAL)
    setEditandoId(null)
    setError('')
    setAbierto(true)
  }

  const abrirEditar = (proveedor: Proveedor) => {
    setForm(proveedorAFormulario(proveedor))
    setEditandoId(proveedor.id)
    setError('')
    setAbierto(true)
  }

  const cerrar = () => {
    if (guardando) return
    setAbierto(false)
  }

  const cambiar = <K extends keyof FormularioProveedor>(campo: K, valor: FormularioProveedor[K]) => {
    setForm((actual) => ({ ...actual, [campo]: valor }))
  }

  const guardar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    setGuardando(true)
    setError('')

    try {
      await guardarProveedor(form, editandoId)
      setAbierto(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el proveedor.')
    } finally {
      setGuardando(false)
    }
  }

  return { abierto, form, editandoId, modoEdicion: editandoId !== null, guardando, error, abrirCrear, abrirEditar, cerrar, cambiar, guardar }
}
