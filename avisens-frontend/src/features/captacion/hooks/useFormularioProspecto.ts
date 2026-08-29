import { useState } from 'react'
import { AxiosError } from 'axios'
import { crearProspectoWeb } from '../api/captacion'
import { formularioInicial, type FormularioProspectoWeb } from '../model/prospectoWeb'

type ErroresFormulario = Partial<Record<keyof FormularioProspectoWeb, string>>

function validar(formulario: FormularioProspectoWeb): ErroresFormulario {
  const errores: ErroresFormulario = {}

  if (formulario.nombre.trim().length < 2) errores.nombre = 'Escribe tu nombre completo.'
  if (!/^[+0-9()\s-]{7,20}$/.test(formulario.telefono.trim())) {
    errores.telefono = 'Escribe un número de teléfono válido.'
  }
  if (!formulario.municipio.trim()) errores.municipio = 'Indica tu municipio.'
  if (!formulario.tipo_produccion.trim()) {
    errores.tipo_produccion = 'Cuéntanos qué producción manejas.'
  }
  if (formulario.email && !/^\S+@\S+\.\S+$/.test(formulario.email)) {
    errores.email = 'Escribe un correo válido o déjalo vacío.'
  }
  if (!formulario.consentimiento_habeas_data) {
    errores.consentimiento_habeas_data = 'Necesitamos tu autorización para contactarte.'
  }

  return errores
}

function mensajeDeError(error: unknown) {
  if (error instanceof AxiosError) {
    const respuesta = error.response?.data as { message?: string | string[] } | undefined
    if (Array.isArray(respuesta?.message)) return respuesta.message[0]
    if (respuesta?.message) return respuesta.message
  }
  return 'No pudimos enviar tu solicitud. Revisa tu conexión e inténtalo de nuevo.'
}

export function useFormularioProspecto() {
  const [formulario, setFormulario] = useState(formularioInicial)
  const [errores, setErrores] = useState<ErroresFormulario>({})
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState('')

  function actualizar(campo: keyof FormularioProspectoWeb, valor: string | boolean) {
    setFormulario((actual) => ({ ...actual, [campo]: valor }))
    setErrores((actual) => ({ ...actual, [campo]: undefined }))
    setErrorEnvio('')
  }

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const nuevosErrores = validar(formulario)
    setErrores(nuevosErrores)

    if (Object.keys(nuevosErrores).length > 0) return

    setEnviando(true)
    setErrorEnvio('')

    try {
      await crearProspectoWeb(formulario)
      setEnviado(true)
    } catch (error) {
      setErrorEnvio(mensajeDeError(error))
    } finally {
      setEnviando(false)
    }
  }

  return { formulario, errores, enviando, enviado, errorEnvio, actualizar, enviar }
}
