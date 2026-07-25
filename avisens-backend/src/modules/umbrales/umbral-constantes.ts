// Variables ambientales que se monitorean y su criticidad, centralizadas para
// que el DTO valide contra valores conocidos (sin enum en la BD).

export const VARIABLES_AMBIENTALES = [
  'temperatura',
  'humedad',
  'luminosidad',
] as const;

export const CRITICIDADES = ['baja', 'media', 'alta', 'critica'] as const;
