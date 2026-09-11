// Cuando alguien escribe por WhatsApp con nombre de usuario en vez de enseñar
// su número, Meta no manda teléfono: manda una identidad con forma `CO.1639…`.
// El backend la guarda en la misma columna `telefono` porque es con lo que se
// le responde — `whatsapp.sender.ts` la reconoce con este mismo patrón y la
// envía como `recipient` en lugar de `to`.
//
// Para la pantalla el matiz importa: esa cadena NO se puede marcar. Ofrecer
// «Llamar ahora» sobre ella abre el marcador con basura y el asesor cree que
// el sistema perdió el número.
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
