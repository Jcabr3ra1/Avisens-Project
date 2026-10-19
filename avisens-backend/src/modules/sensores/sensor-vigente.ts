import type { Prisma } from '@prisma/client';

export const SENSOR_VIGENTE: Prisma.SensorWhereInput = {
  estado: { not: 'retirado' },
};
