import { useCallback, useEffect, useRef, useState } from 'react'
import {
    listarUsuarios,
    crearUsuario,
    actualizarUsuario,
    eliminarUsuario,
    type Usuario,
    type CrearUsuarioPayload,
    type ActualizarUsuarioPayload,
} from '@shared/api'
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

    const cargar = useCallback(async () => {
        setCargando(true)
        setError('')

        try {
            const lista = await listarUsuarios()
            if (montado.current) setUsuarios(lista)
        } catch (err) {
            if (montado.current) setError(mensajeDeError(err, 'No se pudieron cargar los usuarios.'))
        } finally {
            if (montado.current) setCargando(false)
        }
    }, [])

    useEffect(() => {
        void cargar()
    }, [cargar])

    const crear = useCallback(
        async (datos: CrearUsuarioPayload) => {
            await crearUsuario(datos)
            await cargar()
        },
        [cargar],
    )

    const actualizar = useCallback(
        async (id: number, datos: ActualizarUsuarioPayload) => {
            await actualizarUsuario(id, datos)
            await cargar()
        },
        [cargar],
    )

    const eliminar = useCallback(
        async (id: number) => {
            await eliminarUsuario(id)
            await cargar()
        },
        [cargar],
    )

    return { usuarios, cargando, error, recargar: cargar, crear, actualizar, eliminar }
}