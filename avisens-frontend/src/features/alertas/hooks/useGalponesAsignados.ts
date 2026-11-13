import { useCallback, useEffect, useState } from 'react'
import { contarGalponesVisibles } from '../api/alertas'

// Solo tiene sentido para el operario: el admin y el propietario ven las
// alertas de toda su granja. Mientras no se sabe, devuelve null para no
// mostrar un «no tienes galpones» que luego desaparece.
export function useGalponesAsignados(activo: boolean) {
  const [total, setTotal] = useState<number | null>(null)

  const recargar = useCallback(async () => {
    if (!activo) return
    try {
      setTotal(await contarGalponesVisibles())
    } catch {
      // Si falla, no se afirma nada: la pantalla sigue con su flujo normal.
      setTotal(null)
    }
  }, [activo])

  useEffect(() => {
    void recargar()
  }, [recargar])

  return { sinGalpones: activo && total === 0, recargar }
}
