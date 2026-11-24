import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { type ActualizarUsuarioPayload, type CrearUsuarioPayload, type Usuario } from '@shared/api'
import { actualizarUsuario, crearUsuario, eliminarUsuario, listarUsuarios } from '@features/usuarios/api/usuarios'
import { mensajeDeError } from '@shared/utils/errores'

export function useUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const montado = useRef(true)

  useEffect(() => {
    montado.current = true
    return () => {
      montado.current = false
    }
  }, [])

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true)
    setError('')

    try {
      const lista = await listarUsuarios()
      if (montado.current) setUsuarios(lista)
    } catch (err) {
      if (montado.current && !silencioso) {
        setError(mensajeDeError(err, 'No se pudieron cargar los usuarios.'))
      }
    } finally {
      if (montado.current && !silencioso) setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const crear = useCallback(
    async (datos: CrearUsuarioPayload) => {
      const usuario = await crearUsuario(datos)
      if (montado.current) {
        setUsuarios((actuales) => [usuario, ...actuales])
        toast.success(`${usuario.nombre_completo} registrado`)
      }
    },
    [],
  )

  const actualizar = useCallback(
    async (id: number, datos: ActualizarUsuarioPayload) => {
      const usuario = await actualizarUsuario(id, datos)
      if (montado.current) {
        setUsuarios((actuales) => actuales.map((actual) => (actual.id === id ? usuario : actual)))
        toast.success('Datos actualizados')
      }
    },
    [],
  )

  const alternarActivo = useCallback(
    async (usuario: Usuario) => {
      setError('')
      try {
        const actualizado = await actualizarUsuario(usuario.id, { activo: !usuario.activo })
        if (montado.current) {
          setUsuarios((actuales) =>
            actuales.map((actual) => (actual.id === actualizado.id ? actualizado : actual)),
          )
          toast.success(
            actualizado.activo
              ? `${actualizado.nombre_completo} volvió a estar activo`
              : `${actualizado.nombre_completo} quedó inactivo`,
          )
        }
      } catch (err) {
        toast.error(mensajeDeError(err, 'No se pudo cambiar el estado del usuario.'))
      }
    },
    [],
  )

  const eliminar = useCallback(
    async (id: number) => {
      setError('')
      try {
        await eliminarUsuario(id)
        if (montado.current) {
          setUsuarios((actuales) => actuales.filter((usuario) => usuario.id !== id))
          toast.success('Usuario eliminado')
        }
      } catch (err) {
        toast.error(mensajeDeError(err, 'No se pudo eliminar el usuario.'))
      }
    },
    [],
  )

  return {
    usuarios,
    cargando,
    error,
    recargar: cargar,
    crear,
    actualizar,
    alternarActivo,
    eliminar,
  }
}
