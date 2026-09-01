import { useEffect, useMemo, useState } from 'react'
import { mensajeDeError } from '@shared/utils/errores'
import { listarContactosChat, type ContactoChat } from '../api/chat'

export function useContactosChat(activo: boolean) {
  const [contactos, setContactos] = useState<ContactoChat[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    if (!activo) return
    let vigente = true
    setCargando(true)

    listarContactosChat()
      .then((lista) => { if (vigente) setContactos(lista) })
      .catch((err) => {
        if (vigente) setError(mensajeDeError(err, 'No pudimos cargar los contactos.'))
      })
      .finally(() => { if (vigente) setCargando(false) })

    return () => { vigente = false }
  }, [activo])

  const visibles = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase('es-CO')
    if (!termino) return contactos
    return contactos.filter((contacto) =>
      `${contacto.nombre_completo} ${contacto.rol}`
        .toLocaleLowerCase('es-CO')
        .includes(termino),
    )
  }, [busqueda, contactos])

  // Agrupa por rol para que la lista se lea por equipos y no como un directorio
  // plano: quien busca a su propietario no quiere recorrer veinte operarios.
  const porRol = useMemo(() => {
    const grupos = new Map<string, ContactoChat[]>()
    for (const contacto of visibles) {
      const actual = grupos.get(contacto.rol) ?? []
      actual.push(contacto)
      grupos.set(contacto.rol, actual)
    }
    return [...grupos.entries()]
  }, [visibles])

  return { contactos: visibles, porRol, cargando, error, busqueda, setBusqueda }
}
