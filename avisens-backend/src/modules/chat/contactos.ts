/**
 * Las iniciales salen del backend, no del JSX.
 *
 * El avatar aparece en la lista de contactos, en la de conversaciones y en
 * cada burbuja del hilo. Calcularlo en tres componentes distintos es tres
 * sitios donde "María José Pérez" puede salir como MJ en uno y MJP en otro.
 */
export function iniciales(nombreCompleto: string): string {
  const partes = nombreCompleto.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '';
  const primera = partes[0][0];
  const segunda = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return `${primera}${segunda}`.toUpperCase();
}
