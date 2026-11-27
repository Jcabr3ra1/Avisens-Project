import { useState, type FormEvent } from 'react'
import type { CrearGalponPayload, Galpon } from '../api/galpones'
import { obtenerMensajeError } from '../model/errorApi'
import {
  crearFormularioGalpon,
  crearPayloadGalpon,
  formularioDesdeGalpon,
  type FormularioGalponDatos,
} from '../model/formularioGalpon'

type GuardarGalpon = (datos: CrearGalponPayload, editandoId: number | null) => Promise<void>

export function useFormularioGalpon(alGuardar: GuardarGalpon) {
  const [abierto, setAbierto] = useState(false)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [form, setForm] = useState<FormularioGalponDatos>(() => crearFormularioGalpon(0))
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  function abrirCrear(granjaId: number) {
    setEditandoId(null)
    setForm(crearFormularioGalpon(granjaId))
    setError('')
    setAbierto(true)
  }

  function abrirEditar(galpon: Galpon) {
    setEditandoId(galpon.id)
    setForm(formularioDesdeGalpon(galpon))
    setError('')
    setAbierto(true)
  }

  function cambiar<K extends keyof FormularioGalponDatos>(
    campo: K,
    valor: FormularioGalponDatos[K],
  ) {
    setForm((actual) => ({ ...actual, [campo]: valor }))
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setGuardando(true)
    setError('')
    try {
      await alGuardar(crearPayloadGalpon(form), editandoId)
      setAbierto(false)
    } catch (errorGuardado) {
      const accion = editandoId === null ? 'crear' : 'actualizar'
      setError(obtenerMensajeError(errorGuardado, `No se pudo ${accion} el galpón.`))
    } finally {
      setGuardando(false)
    }
  }

  function cerrar() {
    if (!guardando) setAbierto(false)
  }

  return { abierto, modoEdicion: editandoId !== null, form, guardando, error, abrirCrear, abrirEditar, cambiar, guardar, cerrar }
}
