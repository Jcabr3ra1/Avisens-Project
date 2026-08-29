import { useState, type FormEvent } from 'react'
import type { ActualizarLotePayload, CrearLotePayload, Lote } from '../api/lotes'
import { obtenerMensajeError } from '../model/errorApi'
import {
  actualizarPayloadLote,
  crearFormularioLote,
  crearPayloadLote,
  formularioDesdeLote,
  type FormularioLoteDatos,
} from '../model/formularioLote'

type GuardarLote = (
  datos: CrearLotePayload | ActualizarLotePayload,
  editandoId: number | null,
) => Promise<void>

export function useFormularioLote(alGuardar: GuardarLote) {
  const [abierto, setAbierto] = useState(false)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [form, setForm] = useState<FormularioLoteDatos>(() => crearFormularioLote(0, 0))
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  function abrirCrear(galponId: number, proveedorId: number) {
    setEditandoId(null)
    setForm(crearFormularioLote(galponId, proveedorId))
    setError('')
    setAbierto(true)
  }

  function abrirEditar(lote: Lote) {
    setEditandoId(lote.id)
    setForm(formularioDesdeLote(lote))
    setError('')
    setAbierto(true)
  }

  function cambiar<K extends keyof FormularioLoteDatos>(
    campo: K,
    valor: FormularioLoteDatos[K],
  ) {
    setForm((actual) => ({ ...actual, [campo]: valor }))
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setGuardando(true)
    setError('')
    try {
      const datos = editandoId === null ? crearPayloadLote(form) : actualizarPayloadLote(form)
      await alGuardar(datos, editandoId)
      setAbierto(false)
    } catch (errorGuardado) {
      const accion = editandoId === null ? 'crear' : 'actualizar'
      setError(obtenerMensajeError(errorGuardado, `No se pudo ${accion} el lote.`))
    } finally {
      setGuardando(false)
    }
  }

  function cerrar() {
    if (!guardando) setAbierto(false)
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
    cerrar,
  }
}
