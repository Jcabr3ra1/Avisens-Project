import { useCallback, useState, type FormEvent } from 'react'
import type { CrearUsuarioPayload, Usuario } from '@shared/api'
import { mensajeDeError } from '@shared/utils/errores'

const FORMULARIO_VACIO: CrearUsuarioPayload = {
  nombre_completo: '',
  cedula: '',
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
  const [verPassword, setVerPassword] = useState(false)

  const modoEdicion = editandoId !== null

  const abrirCrear = useCallback((rolId: number) => {
    setEditandoId(null)
    setForm({ ...FORMULARIO_VACIO, rol_id: rolId })
    setError('')
    setVerPassword(false)
    setAbierto(true)
  }, [])

  const abrirEditar = useCallback((usuario: Usuario) => {
    setEditandoId(usuario.id)
    setForm({
      nombre_completo: usuario.nombre_completo,
      cedula: usuario.cedula,
      email: usuario.email,
      password: '',
      telefono: usuario.telefono ?? '',
      rol_id: usuario.rol.id,
      organizacion_id: usuario.organizacion_id ?? undefined,
    })
    setError('')
    setVerPassword(false)
    setAbierto(true)
  }, [])

  const cerrar = useCallback(() => {
    if (!guardando) setAbierto(false)
  }, [guardando])

  const cambiar = useCallback(
    <K extends keyof CrearUsuarioPayload>(campo: K, valor: CrearUsuarioPayload[K]) => {
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
      setGuardando(true)

      try {
        await alGuardar(form, editandoId)
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
