export type DatosDispositivo = {
  mac_address: string
  codigo_topic: string
  nombre: string
  version_firmware: string
  ip_local: string
}

export const FORMULARIO_DISPOSITIVO_INICIAL: DatosDispositivo = {
  mac_address: '',
  codigo_topic: '',
  nombre: '',
  version_firmware: '',
  ip_local: '',
}

// La MAC tiene formato fijo y es @unique en la base. Comprobarla aquí evita
// que el usuario reciba un error de restricción que no explica nada.
// Acepta mayúsculas y minúsculas: los ESP32 la imprimen de las dos formas.
export function esMacValida(mac: string): boolean {
  return /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(mac.trim())
}
