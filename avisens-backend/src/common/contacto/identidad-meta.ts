/**
 * Meta no siempre entrega un teléfono como remitente.
 *
 * Cuando la persona escribe desde una cuenta con nombre de usuario, en vez del
 * número llega un identificador con la forma `CO.1639897497563370`. Sirve para
 * responderle, pero no es un dato que ella reconozca: enseñárselo como «tu
 * teléfono» y pedirle que lo confirme sólo siembra duda.
 */
const IDENTIDAD_META = /^[A-Z]{2}\.\d+$/;

export function esIdentidadMeta(contacto?: string | null): boolean {
  return typeof contacto === 'string' && IDENTIDAD_META.test(contacto);
}
