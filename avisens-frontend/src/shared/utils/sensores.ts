// sensores.ts — Reglas compartidas para interpretar una lectura de sensor,
// usadas tanto en Monitoreo como en Alertas para que un mismo valor real
// (ej. la temperatura en vivo de GP-01) se clasifique exactamente igual en
// las dos pantallas.

export type EstadoSensorCalculado = 'optimo' | 'advertencia' | 'critico'

// El mock trae el estado ya decidido a mano; una lectura que llega en vivo
// (por ejemplo, desde un ESP32 vía Firebase) no lo trae, así que hay que
// calcularlo — con una regla distinta según el tipo de variable:
export function calcularEstadoSensor(valor: number, minUmbral: number, maxUmbral: number): EstadoSensorCalculado {
  // Variables sin piso real (minUmbral = 0, típico de gases como CO₂/NH₃):
  // el minUmbral ahí es solo un relleno, no un límite inferior peligroso.
  // Lo que importa es qué tan cerca está del techo: por debajo del 70% del
  // máximo es seguro; entre 70% y el máximo, advertencia; en o sobre el
  // máximo, crítico. (Antes se comparaba contra el rango completo como si
  // tuviera piso, y un CO₂ en 2780 de 3000 ppm salía "óptimo" — un valor a
  // punto de cruzar el techo no es realmente "todo bien".)
  if (minUmbral <= 0 && maxUmbral > 0) {
    const ratio = valor / maxUmbral
    if (ratio <= 0.7) return 'optimo'
    if (ratio < 1.0) return 'advertencia'
    return 'critico'
  }

  // Variables con un rango real (temperatura, humedad): dentro del rango es
  // óptimo; fuera por menos de un 15% del ancho del rango es advertencia;
  // más lejos que eso es crítico.
  const rango  = maxUmbral - minUmbral || 1
  const margen = rango * 0.15
  if (valor >= minUmbral && valor <= maxUmbral) return 'optimo'
  if (valor >= minUmbral - margen && valor <= maxUmbral + margen) return 'advertencia'
  return 'critico'
}

// Orden fijo de variables, para construir un ID numérico único y estable por
// combinación de galpón + variable (usado por el motor de alertas de
// AlertasPage y por quien necesite saber si "esa misma alerta" ya se vio,
// como el aviso del avatar AVIA en Mi galpón).
const ORDEN_VARIABLES: string[] = ['temperatura', 'humedad', 'co2', 'nh3', 'luz']
export function idAlertaSensor(galponId: number, variable: string): number {
  const indice = ORDEN_VARIABLES.indexOf(variable)
  return 1000 + galponId * 10 + (indice >= 0 ? indice : 9)
}

// Convierte una marca de tiempo (epoch ms) en un texto relativo tipo "hace Xs/min/h".
export function formatearHace(ts: number): string {
  const segundos = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (segundos < 60) return `hace ${segundos}s`
  const minutos = Math.floor(segundos / 60)
  if (minutos < 60) return `hace ${minutos}min`
  return `hace ${Math.floor(minutos / 60)}h`
}

// Convierte una marca de tiempo (epoch ms) al formato "DD/MM/YYYY HH:mm" que
// usan las alertas mock, para que una alerta generada en vivo se vea igual
// de bien formateada que una escrita a mano.
export function formatearFechaHora(ts: number): string {
  const d = new Date(ts)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`
}
