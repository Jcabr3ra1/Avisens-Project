import { BadRequestException } from '@nestjs/common';
import { esCanalRele, esUnidadEstado } from './reles';

// GPIO de datos disponibles para DHT22 en el firmware ESP32 DevKit.
// El firmware excluye además su PIN_RELE real.
export const GPIO_DHT22 = [
  4, 13, 14, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33,
];

export function validarConexionSensor(
  canal: string | null | undefined,
  tipo: string,
  modelo: string | null | undefined,
  unidad?: string | null,
) {
  if (canal == null) return;
  // Relés K1-K4: el canal es la identidad física; el tipo es solo su nombre
  // visible. Reportan 1/0, así que su unidad es "estado".
  if (canal.startsWith('rele:')) {
    if (!esCanalRele(canal) || !esUnidadEstado(unidad)) {
      throw new BadRequestException(
        'Un relé usa el canal rele:k1 a rele:k4 y la unidad "estado"',
      );
    }
    return;
  }
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
  // Según el adaptador, Prisma informa las columnas (meta.target) o el
  // nombre del índice (p. ej. el parcial "sensores_rele_canal_unico", creado
  // por SQL). Los dos índices de conexión mencionan "canal"; el del código
  // ("sensores_codigo_key") no.
  const meta = 'meta' in error ? error.meta : undefined;
  return JSON.stringify(meta ?? {}).includes('canal');
}
