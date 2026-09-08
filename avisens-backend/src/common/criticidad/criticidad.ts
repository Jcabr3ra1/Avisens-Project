/**
 * La escala de criticidad, una sola para todo el sistema.
 *
 * Convivían tres: umbrales usaba cuatro niveles en minúscula, políticas de
 * alerta validaba ['Baja','Media','Alta'] con mayúscula, y el alta manual de
 * alertas no validaba nada, así que aceptaba cualquier texto. De ahí salían
 * las 'crítica' con tilde que aparecían en pantalla.
 *
 * Son tres y no cuatro porque 'critica' era un nivel muerto: ningún camino
 * automático podía producirlo —el cálculo desde umbrales tope en 'alta'— y la
 * interfaz lo pintaba igual que 'alta'. Un nivel que nadie sabe cuándo usar es
 * justo donde se acumulan los datos inconsistentes.
 */
export const CRITICIDADES = ['baja', 'media', 'alta'] as const;

export type Criticidad = (typeof CRITICIDADES)[number];

/**
 * Las que merecen atención inmediata.
 *
 * El tablero contaba `criticidad = 'critica'`, un valor que el sistema nunca
 * escribía solo, así que mostraba cero mientras había lecturas muy fuera de
 * rango sin atender. Ahora cuenta el nivel más alto que el cálculo automático
 * sí alcanza.
 */
export const CRITICIDADES_GRAVES: readonly Criticidad[] = ['alta'];

export function esCriticidadGrave(valor: string): boolean {
  return (CRITICIDADES_GRAVES as readonly string[]).includes(valor);
}
