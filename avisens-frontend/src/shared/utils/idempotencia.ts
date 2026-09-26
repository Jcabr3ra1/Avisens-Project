// Identificador de UN intento de una operación que no debe repetirse.
//
// El backend guarda esta clave junto al resultado: si llega otra vez la
// misma, devuelve lo que ya hizo en vez de volver a hacerlo. La usan las
// recepciones de compra y el consumo de repuestos, que mueven stock.
//
// La clave tiene que ser ESTABLE mientras se reintenta lo mismo. Generarla
// dentro de la función que envía —como se hacía— produce una distinta en
// cada llamada, y entonces un reintento nunca se reconoce como tal: la
// protección del backend existe pero no llega a actuar. Por eso la crea
// quien controla el intento, la guarda, y la descarta al terminar o al
// cambiar los datos.
export function nuevaClaveIdempotencia(prefijo: string): string {
  const aleatorio =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  return `${prefijo}-${aleatorio}`
}
