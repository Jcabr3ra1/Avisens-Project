type UmbralBase = {
  galpon_id: number
  variable: string
  semana_vida: number
  vigente: boolean
}

// El umbral con que se compara una lectura: el de la semana de vida del lote
// o, si esa semana no tiene, el de la última semana configurada antes de ella.
// Es la misma regla del backend (alertas.service, evaluarLectura): la
// configuración cubre las semanas 0 a 6 y un lote que sigue en el galpón
// después quedaba «sin umbral» aquí mientras el servidor sí lo comparaba.
// Solo cuentan los umbrales vigentes; las versiones anteriores son historial.
export function umbralDeLaSemana<T extends UmbralBase>(
  umbrales: T[],
  galponId: number,
  variable: string,
  semanaVida: number,
): T | undefined {
  let elegido: T | undefined
  for (const umbral of umbrales) {
    if (!umbral.vigente || umbral.galpon_id !== galponId || umbral.variable !== variable) continue
    if (umbral.semana_vida > semanaVida) continue
    if (!elegido || umbral.semana_vida > elegido.semana_vida) elegido = umbral
  }
  return elegido
}
