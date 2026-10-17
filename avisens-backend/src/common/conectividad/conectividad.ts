export const VENTANA_CONECTIVIDAD_MINUTOS = 15;

export type EstadoConexion = 'conectado' | 'sin_reportar' | 'nunca';

export function estadoConexion(
  ultimaConexion: Date | null,
  ahora: Date = new Date(),
): EstadoConexion {
  if (!ultimaConexion) return 'nunca';
  const minutos = (ahora.getTime() - ultimaConexion.getTime()) / 60_000;
  return minutos <= VENTANA_CONECTIVIDAD_MINUTOS ? 'conectado' : 'sin_reportar';
}
