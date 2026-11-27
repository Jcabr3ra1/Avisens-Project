import { useState } from 'react'
import { mensajeDeError } from '@shared/utils/errores'
import { validarNombreEntidad, validarTextoSeguro } from '@shared/utils/validacion'
import type { ActualizarInsumoPayload, CrearInsumoPayload, Insumo } from '../api/insumos'
import {
  actualizarPayloadInsumo,
  crearFormularioInsumo,
  crearPayloadInsumo,
  formularioDesdeInsumo,
  type FormularioInsumoDatos,
} from '../model/formularioInsumo'

// Mensaje pensado para mostrarse tal cual en el formulario (p. ej. el aviso
// de insumo duplicado). Los errores de red siguen pasando por mensajeDeError.
export class AvisoInsumo extends Error {}

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

  function validarFormulario(): string | null {
    const errNombre = validarNombreEntidad(form.nombre, 'El nombre del insumo', { max: 120 })
    if (errNombre) return errNombre
    const errUnidad = validarTextoSeguro(form.unidad_medida, 'La unidad de medida', {
      requerido: true,
      max: 30,
      exigirLetras: true,
    })
    if (errUnidad) return errUnidad
    const errTipo = validarTextoSeguro(form.tipo, 'El tipo de insumo', { max: 50 })
    if (errTipo) return errTipo
    const errUbicacion = validarTextoSeguro(form.ubicacion_almacen, 'La ubicación', { max: 120 })
    if (errUbicacion) return errUbicacion

    const validarNumero = (valor: string, etiqueta: string, maximo: number): string | null => {
      if (!valor.trim()) return null
      const num = Number(valor)
      if (!Number.isFinite(num) || num < 0) return `${etiqueta} no puede ser negativo.`
      if (num > maximo) return `${etiqueta} no puede superar ${maximo.toLocaleString('es-CO')}.`
      return null
    }
    const errMin = validarNumero(form.stock_minimo, 'El stock mínimo', 10_000_000)
    if (errMin) return errMin
    if (editandoId === null) {
      const errAct = validarNumero(form.stock_actual, 'El stock inicial', 10_000_000)
      if (errAct) return errAct
    }
    const errPrecio = validarNumero(form.precio_unitario_cop, 'El precio unitario', 10_000_000_000)
    if (errPrecio) return errPrecio
    return null
  }

  async function guardar() {
    const problema = validarFormulario()
    if (problema) {
      setError(problema)
      return
    }
    setGuardando(true)
    setError('')
    try {
      const datos =
        editandoId === null ? crearPayloadInsumo(form) : actualizarPayloadInsumo(form)
      await alGuardar(datos, editandoId)
      setAbierto(false)
    } catch (errorGuardado) {
      setError(errorGuardado instanceof AvisoInsumo
        ? errorGuardado.message
        : mensajeDeError(errorGuardado, 'No se pudo guardar el insumo.'))
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
