const IDENTIDAD_WHATSAPP = /^[A-Z]{2}\.\d+$/

export function esIdentidadWhatsapp(contacto: string | null): boolean {
  return contacto !== null && IDENTIDAD_WHATSAPP.test(contacto.trim())
}

export function sePuedeLlamar(contacto: string | null): boolean {
  return contacto !== null && contacto.trim() !== '' && !esIdentidadWhatsapp(contacto)
}

export function etiquetaContacto(contacto: string | null): string {
  return esIdentidadWhatsapp(contacto) ? 'Usuario de WhatsApp' : 'Teléfono'
}
