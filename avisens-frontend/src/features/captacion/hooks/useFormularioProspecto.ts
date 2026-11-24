import { useState } from 'react'
import { AxiosError } from 'axios'
import {
  validarNombreEntidad,
  validarNombrePersona,
  validarTelefonoPublico,
} from '@shared/utils/validacion'
import { crearProspectoWeb } from '../api/captacion'
import { formularioInicial, type FormularioProspectoWeb } from '../model/prospectoWeb'

type ErroresFormulario = Partial<Record<keyof FormularioProspectoWeb, string>>

function validar(formulario: FormularioProspectoWeb): ErroresFormulario {
  const errores: ErroresFormulario = {}

  const errorNombre = validarNombrePersona(formulario.nombre, 'Tu nombre completo', 100)
  if (errorNombre) errores.nombre = errorNombre
  const errorTelefono = validarTelefonoPublico(formulario.telefono, true)
  if (errorTelefono) errores.telefono = errorTelefono
  const errorMunicipio = validarNombreEntidad(formulario.municipio, 'El municipio', { max: 80 })
  if (errorMunicipio) errores.municipio = errorMunicipio
  const errorProd = validarNombreEntidad(formulario.tipo_produccion, 'El tipo de producción', { max: 80 })
  if (errorProd) errores.tipo_produccion = errorProd
  if (formulario.email && !/^\S+@\S+\.\S+$/.test(formulario.email.trim())) {
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
