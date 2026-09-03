import { useState } from 'react'
import { mensajeDeError } from '@shared/utils/errores'
import type { ActualizarInsumoPayload, CrearInsumoPayload, Insumo } from '../api/insumos'
import {
  actualizarPayloadInsumo,
  crearFormularioInsumo,
  crearPayloadInsumo,
  formularioDesdeInsumo,
  type FormularioInsumoDatos,
} from '../model/formularioInsumo'

type GuardarInsumo = (
  datos: CrearInsumoPayload | ActualizarInsumoPayload,
  editandoId: number | null,
) => Promise<void>

export function useFormularioInsumo(alGuardar: GuardarInsumo, granjaPorDefecto = 0) {
  const [abierto, setAbierto] = useState(false)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [form, setForm] = useState<FormularioInsumoDatos>(() => crearFormularioInsumo(granjaPorDefecto))
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  function abrirCrear() {
    setEditandoId(null)
    setForm(crearFormularioInsumo(granjaPorDefecto))
    setError('')
    setAbierto(true)
  }

  function abrirEditar(insumo: Insumo) {
    setEditandoId(insumo.id)
    setForm(formularioDesdeInsumo(insumo))
    setError('')
    setAbierto(true)
  }

  function cambiar<K extends keyof FormularioInsumoDatos>(
    campo: K,
    valor: FormularioInsumoDatos[K],
  ) {
    setForm((previo) => ({ ...previo, [campo]: valor }))
  }

  async function guardar() {
    setGuardando(true)
    setError('')
    try {
      const datos =
        editandoId === null ? crearPayloadInsumo(form) : actualizarPayloadInsumo(form)
      await alGuardar(datos, editandoId)
      setAbierto(false)
    } catch (errorGuardado) {
      setError(mensajeDeError(errorGuardado, 'No se pudo guardar el insumo.'))
    } finally {
      setGuardando(false)
    }
  }

  return {
    abierto,
    modoEdicion: editandoId !== null,
    form,
    guardando,
    error,
    abrirCrear,
    abrirEditar,
    cambiar,
    guardar,
    cerrar: () => setAbierto(false),
  }
}
