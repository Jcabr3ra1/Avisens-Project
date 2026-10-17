import { BadRequestException } from '@nestjs/common';

// GPIO de datos disponibles para DHT22 en el firmware ESP32 DevKit.
// El firmware excluye además su PIN_RELE real.
export const GPIO_DHT22 = [
  4, 13, 14, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33,
];

export function validarConexionSensor(
  canal: string | null | undefined,
  tipo: string,
  modelo: string | null | undefined,
) {
  if (canal == null) return;
  const pin = /^gpio:(\d+)$/.exec(canal);
  if (
    !pin ||
    !GPIO_DHT22.includes(Number(pin[1])) ||
    canal !== `gpio:${Number(pin[1])}` ||
    !['temperatura', 'humedad'].includes(tipo) ||
    modelo?.toUpperCase() !== 'DHT22'
  ) {
    throw new BadRequestException(
      'La conexión dinámica requiere temperatura o humedad, modelo DHT22 y un GPIO de datos habilitado',
    );
  }
}

export function esConflictoConexion(error: unknown): boolean {
  if (
    typeof error !== 'object' ||
    error === null ||
    !('code' in error) ||
    error.code !== 'P2002'
  )
    return false;
  const meta = 'meta' in error ? error.meta : undefined;
  const target =
    typeof meta === 'object' && meta !== null && 'target' in meta
      ? meta.target
      : undefined;
  return Array.isArray(target)
    ? target.includes('canal')
    : typeof target === 'string' && target.includes('canal');
}
