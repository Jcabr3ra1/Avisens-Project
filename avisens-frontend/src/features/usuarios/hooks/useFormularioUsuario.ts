import { useCallback, useState, type FormEvent } from 'react'
import type { CrearUsuarioPayload, Usuario } from '@shared/api'
import { mensajeDeError } from '@shared/utils/errores'
import { erroresDeUsuario, limpiarTelefono, type ErroresUsuario } from '../model/validacionUsuario'

const FORMULARIO_VACIO: CrearUsuarioPayload = {
  nombre_completo: '',
  cedula: '',
  username: '',
  email: '',
  password: '',
  telefono: '',
  rol_id: 0,
}

type AlGuardar = (
  datos: CrearUsuarioPayload,
  editandoId: number | null,
) => Promise<void>

export function useFormularioUsuario(alGuardar: AlGuardar) {
  const [abierto, setAbierto] = useState(false)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [form, setForm] = useState<CrearUsuarioPayload>({ ...FORMULARIO_VACIO })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [errores, setErrores] = useState<ErroresUsuario>({})
  const [verPassword, setVerPassword] = useState(false)

  const modoEdicion = editandoId !== null

  const abrirCrear = useCallback((rolId: number) => {
    setEditandoId(null)
    setForm({ ...FORMULARIO_VACIO, rol_id: rolId })
    setError('')
    setErrores({})
    setVerPassword(false)
    setAbierto(true)
  }, [])

  const abrirEditar = useCallback((usuario: Usuario) => {
    setEditandoId(usuario.id)
    setForm({
      nombre_completo: usuario.nombre_completo,
      cedula: usuario.cedula,
      username: usuario.username,
      email: usuario.email ?? '',
      password: '',
      telefono: usuario.telefono ?? '',
      rol_id: usuario.rol.id,
      organizacion_id: usuario.organizacion_id ?? undefined,
    })
    setError('')
    setErrores({})
    setVerPassword(false)
    setAbierto(true)
  }, [])

  const cerrar = useCallback(() => {
    if (!guardando) setAbierto(false)
  }, [guardando])

  const cambiar = useCallback(
    <K extends keyof CrearUsuarioPayload>(campo: K, valor: CrearUsuarioPayload[K]) => {
      // El aviso del campo se borra en cuanto se corrige.
      setErrores((anteriores) => (campo in anteriores ? { ...anteriores, [campo]: undefined } : anteriores))
      setForm((anterior) => {
        if (campo === 'rol_id') {
          return {
            ...anterior,
            rol_id: valor as number,
            organizacion_id: undefined,
            organizacion_nombre: undefined,
          }
        }
        return { ...anterior, [campo]: valor }
      })
    },
    [],
  )

  const guardar = useCallback(
    async (evento: FormEvent) => {
      evento.preventDefault()
      setError('')
      const encontrados = erroresDeUsuario(form)
      setErrores(encontrados)
      if (Object.values(encontrados).some(Boolean)) return
      setGuardando(true)

      try {
        await alGuardar(
          {
            ...form,
            cedula: form.cedula.trim(),
            telefono: form.telefono ? limpiarTelefono(form.telefono) : form.telefono,
            email: form.email?.trim() ?? form.email,
          },
          editandoId,
        )
        setAbierto(false)
      } catch (err) {
        setError(
          mensajeDeError(
            err,
            `No se pudo ${modoEdicion ? 'actualizar' : 'crear'} el usuario.`,
          ),
        )
      } finally {
        setGuardando(false)
      }
    },
    [alGuardar, editandoId, form, modoEdicion],
  )

  return {
    abierto,
    form,
    guardando,
    error,
    errores,
    verPassword,
    modoEdicion,
    abrirCrear,
    abrirEditar,
    cerrar,
    cambiar,
    guardar,
    alternarPassword: () => setVerPassword((visible) => !visible),
  }
}
