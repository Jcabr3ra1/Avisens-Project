import { useState, type FormEvent } from 'react'
import type { CrearGranjaPayload, Granja } from '../api/granjas'
import { obtenerMensajeError } from '../model/errorApi'
import {
  crearFormularioGranja,
  formularioDesdeGranja,
  limpiarPayloadGranja,
} from '../model/formularioGranja'

type GuardarGranja = (datos: CrearGranjaPayload, editandoId: number | null) => Promise<void>

export function useFormularioGranja(alGuardar: GuardarGranja) {
  const [abierto, setAbierto] = useState(false)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [form, setForm] = useState<CrearGranjaPayload>(crearFormularioGranja)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  function abrirCrear() {
    setEditandoId(null)
    setForm(crearFormularioGranja())
    setError('')
    setAbierto(true)
  }

  function abrirEditar(granja: Granja) {
    setEditandoId(granja.id)
    setForm(formularioDesdeGranja(granja))
    setError('')
    setAbierto(true)
  }

  function cambiar(campo: keyof CrearGranjaPayload, valor: string | number | undefined) {
    setForm((actual) => ({ ...actual, [campo]: valor }))
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setGuardando(true)
    setError('')
    try {
      await alGuardar(limpiarPayloadGranja(form), editandoId)
      setAbierto(false)
    } catch (errorGuardado) {
      const accion = editandoId === null ? 'crear' : 'actualizar'
      setError(obtenerMensajeError(errorGuardado, `No se pudo ${accion} la granja.`))
    } finally {
      setGuardando(false)
    }
  }

  function cerrar() {
    if (!guardando) setAbierto(false)
  }

  return { abierto, modoEdicion: editandoId !== null, form, guardando, error, abrirCrear, abrirEditar, cambiar, guardar, cerrar }
}
