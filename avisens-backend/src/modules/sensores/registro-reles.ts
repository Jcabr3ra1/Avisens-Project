// registro-reles.ts — Alta idempotente de los cuatro relés de un ESP32.
//
// Lo usan el endpoint POST /v1/sensores/reles y el script
// seed:sensores-esp32. Recibe un dispositivo ya validado (existe, está
// activo y pertenece al galpón): aquí solo se decide, canal por canal, si
// el relé ya está, si un registro antiguo se puede asociar sin dudas o si
// hay que crearlo.
//
// Reglas:
// - Nunca se borra ni se recrea un sensor: un registro antiguo conserva su
//   id, código, lecturas, órdenes y estado; solo gana el canal.
// - Un registro antiguo se asocia solo si es el ÚNICO candidato del canal en
//   ese ESP32 (mismo dispositivo y galpón, sin canal, no retirado, unidad
//   "estado" y código REL-K<n>-...). Con dos o más, no se toca nada.
// - El índice único parcial (dispositivo_id, canal) de la base es lo que de
//   verdad impide duplicados si dos registros llegan a la vez.
import { randomUUID } from 'node:crypto';
import type { Prisma, PrismaClient } from '@prisma/client';
import { esConflictoConexion } from './conexion-sensor';
import {
  CANALES_RELE,
  NOMBRE_RELE,
  UNIDAD_RELE,
  numeroRele,
  type CanalRele,
} from './reles';

export type ResultadoCanalRele =
  | 'creado' // no había nada: se registró el relé
  | 'asociado' // un registro antiguo REL-K<n> recibió el canal
  | 'existente' // el canal ya estaba registrado en este ESP32
  | 'conflicto'; // no se pudo resolver sin riesgo: no se cambió nada

export type CanalRegistrado = {
  canal: CanalRele;
  nombre: string;
  resultado: ResultadoCanalRele;
  sensor_id: number | null;
  codigo: string | null;
  motivo: string | null;
};

export type DispositivoParaReles = { id: number; galpon_id: number };

type PrismaReles = Pick<PrismaClient, 'sensor'>;

const SELECT_RELE = {
  id: true,
  codigo: true,
  tipo: true,
  estado: true,
} as const satisfies Prisma.SensorSelect;

function esConflictoUnico(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

export async function registrarRelesDispositivo(
  prisma: PrismaReles,
  dispositivo: DispositivoParaReles,
): Promise<CanalRegistrado[]> {
  const resultados: CanalRegistrado[] = [];
  // Canal por canal: un conflicto en K2 no impide registrar K1, K3 y K4.
  for (const canal of CANALES_RELE) {
    resultados.push(await registrarCanal(prisma, dispositivo, canal));
  }
  return resultados;
}

async function registrarCanal(
  prisma: PrismaReles,
  dispositivo: DispositivoParaReles,
  canal: CanalRele,
): Promise<CanalRegistrado> {
  const base = { canal, nombre: NOMBRE_RELE[canal] };

  const existente = await buscarEnCanal(prisma, dispositivo.id, canal);
  if (existente) {
    return {
      ...base,
      resultado: 'existente',
      sensor_id: existente.id,
      codigo: existente.codigo,
      motivo: null,
    };
  }

  const n = numeroRele(canal);
  const candidatos = await prisma.sensor.findMany({
    where: {
      dispositivo_id: dispositivo.id,
      galpon_id: dispositivo.galpon_id,
      canal: null,
      estado: { not: 'retirado' },
      unidad_medida: { equals: UNIDAD_RELE, mode: 'insensitive' },
      codigo: { startsWith: `REL-K${n}-`, mode: 'insensitive' },
    },
    select: SELECT_RELE,
    orderBy: { id: 'asc' },
  });

  if (candidatos.length > 1) {
    return {
      ...base,
      resultado: 'conflicto',
      sensor_id: null,
      codigo: null,
      motivo:
        `Hay ${candidatos.length} registros antiguos que podrían ser K${n} ` +
        `(${candidatos.map((c) => c.codigo).join(', ')}). No se asoció ninguno: ` +
        'edita el que corresponda y asígnale el canal, o retira el sobrante.',
    };
  }

  if (candidatos.length === 1) {
    const antiguo = candidatos[0];
    try {
      // La condición repite canal null y dispositivo: si otro proceso lo
      // cambió entretanto, no se pisa.
      const { count } = await prisma.sensor.updateMany({
        where: {
          id: antiguo.id,
          dispositivo_id: dispositivo.id,
          canal: null,
          estado: { not: 'retirado' },
        },
        data: { canal },
      });
      if (count === 1) {
        return {
          ...base,
          resultado: 'asociado',
          sensor_id: antiguo.id,
          codigo: antiguo.codigo,
          motivo: null,
        };
      }
    } catch (error: unknown) {
      if (!esConflictoUnico(error)) throw error;
    }
    return reconsultar(prisma, dispositivo, canal, base);
  }

  return crearRele(prisma, dispositivo, canal, base);
}

async function crearRele(
  prisma: PrismaReles,
  dispositivo: DispositivoParaReles,
  canal: CanalRele,
  base: { canal: CanalRele; nombre: string },
): Promise<CanalRegistrado> {
  const n = numeroRele(canal);
  // Código interno legible. No lo necesita el firmware; si ya lo usa otro
  // sensor (es único en toda la base), se agrega un sufijo aleatorio.
  const legible = `REL-K${n}-G${dispositivo.galpon_id}-D${dispositivo.id}`;
  for (let intento = 0; intento < 5; intento += 1) {
    const codigo =
      intento === 0
        ? legible
        : `${legible}-${randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()}`;
    try {
      const creado = await prisma.sensor.create({
        data: {
          galpon_id: dispositivo.galpon_id,
          dispositivo_id: dispositivo.id,
          codigo,
          tipo: NOMBRE_RELE[canal],
          canal,
          unidad_medida: UNIDAD_RELE,
          modelo: `Relé K${n}`,
        },
        select: SELECT_RELE,
      });
      return {
        ...base,
        resultado: 'creado',
        sensor_id: creado.id,
        codigo: creado.codigo,
        motivo: null,
      };
    } catch (error: unknown) {
      if (!esConflictoUnico(error)) throw error;
      // ¿Otro registro simultáneo ocupó el canal? Se mira la base y no solo
      // el error: según el adaptador, Prisma no siempre dice qué índice
      // chocó. Si el canal sigue libre, el choque fue del código.
      if (esConflictoConexion(error) || (await buscarEnCanal(prisma, dispositivo.id, canal))) {
        return reconsultar(prisma, dispositivo, canal, base);
      }
    }
  }
  return {
    ...base,
    resultado: 'conflicto',
    sensor_id: null,
    codigo: null,
    motivo: 'No se pudo reservar un código interno único; intenta de nuevo',
  };
}

// Tras una carrera, lo que manda es lo que quedó en la base.
async function reconsultar(
  prisma: PrismaReles,
  dispositivo: DispositivoParaReles,
  canal: CanalRele,
  base: { canal: CanalRele; nombre: string },
): Promise<CanalRegistrado> {
  const actual = await buscarEnCanal(prisma, dispositivo.id, canal);
  if (actual) {
    return {
      ...base,
      resultado: 'existente',
      sensor_id: actual.id,
      codigo: actual.codigo,
      motivo: null,
    };
  }
  return {
    ...base,
    resultado: 'conflicto',
    sensor_id: null,
    codigo: null,
    motivo:
      'Otro cambio simultáneo afectó este canal; vuelve a intentar el registro',
  };
}

function buscarEnCanal(
  prisma: PrismaReles,
  dispositivoId: number,
  canal: CanalRele,
) {
  // Los retirados liberan el canal (quedan con canal null), así que todo lo
  // que aparece aquí ocupa el canal de verdad.
  return prisma.sensor.findFirst({
    where: { dispositivo_id: dispositivoId, canal },
    select: SELECT_RELE,
  });
}
