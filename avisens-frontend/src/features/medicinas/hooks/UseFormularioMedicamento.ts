import { useState } from 'react'
import { mensajeDeError } from '@shared/utils/errores'
import type {
  ActualizarEventoSanitarioPayload,
  CrearEventoSanitarioPayload,
  EventoSanitario,
} from '../api/medicinas'
import {
  actualizarPayloadEvento,
  crearFormularioMedicamento,
  crearPayloadEvento,
  formularioDesdeEvento,
  validarFormulario,
  type FormularioMedicamentoDatos,
} from '../model/medicinas'

type GuardarEvento = (
  datos: CrearEventoSanitarioPayload | ActualizarEventoSanitarioPayload,
  editandoId: number | null,
) => Promise<void>

export function useFormularioMedicamento(alGuardar: GuardarEvento, loteInicial = 0) {
  const [abierto, setAbierto] = useState(false)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [form, setForm] = useState<FormularioMedicamentoDatos>(() =>
    crearFormularioMedicamento(loteInicial),
  )
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  function abrirCrear() {
    setEditandoId(null)
    setForm(crearFormularioMedicamento(loteInicial))
    setError('')
    setAbierto(true)
  }

  function abrirEditar(evento: EventoSanitario) {
    setEditandoId(evento.id)
    setForm(formularioDesdeEvento(evento))
    setError('')
    setAbierto(true)
  }

  function cambiar<K extends keyof FormularioMedicamentoDatos>(
    campo: K,
    valor: FormularioMedicamentoDatos[K],
  ) {
    setForm((previo) => ({ ...previo, [campo]: valor }))
  }

  async function guardar() {
    const problema = validarFormulario(form)
    if (problema) {
      setError(problema)
      return
    }

    setGuardando(true)
    setError('')
    try {
      const datos = editandoId === null ? crearPayloadEvento(form) : actualizarPayloadEvento(form)
      await alGuardar(datos, editandoId)
      setAbierto(false)
    } catch (errorGuardado) {
      setError(mensajeDeError(errorGuardado, 'No se pudo guardar el registro.'))
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
