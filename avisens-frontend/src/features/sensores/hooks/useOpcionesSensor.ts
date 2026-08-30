import { useEffect, useMemo, useState } from 'react'
import { listarDispositivos, type Dispositivo } from '@shared/api'
import { listarGalpones, type Galpon } from '@features/galpones/api/galpones'

export function useOpcionesSensor(galponId: number) {
  const [galpones, setGalpones] = useState<Galpon[]>([])
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let vigente = true
    Promise.all([listarGalpones(), listarDispositivos()])
      .then(([listaGalpones, listaDispositivos]) => {
        if (!vigente) return
        setGalpones(listaGalpones)
        setDispositivos(listaDispositivos)
      })
      .catch(() => undefined)
      .finally(() => {
        if (vigente) setCargando(false)
      })
    return () => {
      vigente = false
    }
  }, [])

  // El backend rechaza un dispositivo que no pertenezca al galpón elegido, así
  // que la lista se filtra aquí en vez de dejar que el usuario falle.
  const dispositivosDelGalpon = useMemo(
    () => dispositivos.filter((dispositivo) => dispositivo.galpon.id === galponId),
    [dispositivos, galponId],
  )

  return { galpones, dispositivosDelGalpon, cargando }
}
