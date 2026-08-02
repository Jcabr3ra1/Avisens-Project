export const ESTADOS_SENSOR = [
  'activo',
  'inactivo',
  'mantenimiento',
  'falla',
] as const;

export type EstadoSensor = (typeof ESTADOS_SENSOR)[number];
