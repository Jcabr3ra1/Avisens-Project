import { useEffect, useState } from 'react'
import { listarCatalogoSensores } from '../api/catalogoSensores'

export function useCatalogoSensores() {
  const [tipos, setTipos] = useState<string[]>([])

  // El catálogo solo alimenta sugerencias del formulario, así que un fallo no
  // se muestra: el campo acepta texto libre y el backend valida.
  useEffect(() => {
    let vigente = true
    listarCatalogoSensores()
      .then((catalogo) => {
        if (!vigente) return
        setTipos(catalogo.filter((item) => item.activo).map((item) => item.tipo_sensor))
      })
      .catch(() => undefined)
    return () => {
      vigente = false
    }
  }, [])

  return { tipos }
}
