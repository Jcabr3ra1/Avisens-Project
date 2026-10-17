// sensores-esp32.ts — Registra los sensores que reporta el firmware del ESP32
// (esp32-firmware/include/config.example.h) para un dispositivo ya creado.
//
// No va en el seed general: los sensores cuelgan de un galpón y un
// dispositivo que cada instalación crea a su manera, y una base nueva no los
// tiene. Se corre después de registrar el ESP32 en la app:
//
//   pnpm run seed:sensores-esp32            → dispositivo "galpon1"
//   pnpm run seed:sensores-esp32 galpon2    → otro codigo_topic
//
// Es idempotente: un sensor cuyo código ya existe se deja como está.
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const adapter = new PrismaPg({
  connectionString: process.env['DATABASE_URL']!,
});
const prisma = new PrismaClient({ adapter });

type SensorFirmware = {
  codigo: string;
  tipo: string;
  unidad_medida: string;
  modelo: string;
};

// Mismos códigos que CODIGO_SENSOR_* / CODIGO_MOTOR_* / CODIGO_RELE_* del
// firmware. Los de unidad "estado" reportan 1 (encendido) o 0 (apagado).
const SENSORES_FIRMWARE: SensorFirmware[] = [
  {
    codigo: 'TEMP-G1-01',
    tipo: 'Temperatura',
    unidad_medida: '°C',
    modelo: 'DHT22',
  },
  { codigo: 'HUM-G1-01', tipo: 'Humedad', unidad_medida: '%', modelo: 'DHT22' },
  {
    codigo: 'AGUA-G1-01',
    tipo: 'Nivel de agua',
    unidad_medida: 'cm',
    modelo: 'HC-SR04',
  },
  {
    codigo: 'MOT-ALIM-G1-01',
    tipo: 'Motor alimentador',
    unidad_medida: 'estado',
    modelo: 'L293D canal B',
  },
  {
    codigo: 'MOT-PERS-G1-01',
    tipo: 'Motor persiana',
    unidad_medida: 'estado',
    modelo: 'L293D canal A',
  },
  {
    codigo: 'REL-K1-G1-01',
    tipo: 'Bombillos calefacción (K1)',
    unidad_medida: 'estado',
    modelo: 'Relé K1',
  },
  {
    codigo: 'REL-K2-G1-01',
    tipo: 'Ventiladores (K2)',
    unidad_medida: 'estado',
    modelo: 'Relé K2',
  },
  {
    codigo: 'REL-K3-G1-01',
    tipo: 'Extractores (K3)',
    unidad_medida: 'estado',
    modelo: 'Relé K3',
  },
  {
    codigo: 'REL-K4-G1-01',
    tipo: 'Bomba de agua (K4)',
    unidad_medida: 'estado',
    modelo: 'Relé K4',
  },
];

async function main() {
  const codigoTopic = process.argv[2] ?? 'galpon1';

  const dispositivo = await prisma.dispositivo.findUnique({
    where: { codigo_topic: codigoTopic },
    select: { id: true, galpon_id: true, nombre: true },
  });
  if (!dispositivo) {
    throw new Error(
      `No existe un dispositivo con codigo_topic "${codigoTopic}". ` +
        'Regístralo primero en la app (Dispositivos) y vuelve a correr el script.',
    );
  }

  let creados = 0;
  for (const s of SENSORES_FIRMWARE) {
    const existente = await prisma.sensor.findUnique({
      where: { codigo: s.codigo },
      select: { dispositivo_id: true },
    });
    if (existente) {
      if (existente.dispositivo_id !== dispositivo.id) {
        console.warn(
          `  ${s.codigo}: ya existe en otro dispositivo (#${existente.dispositivo_id}); se deja igual`,
        );
      }
      continue;
    }
    await prisma.sensor.create({
      data: {
        ...s,
        galpon_id: dispositivo.galpon_id,
        dispositivo_id: dispositivo.id,
      },
    });
    console.log(`  ${s.codigo}: creado`);
    creados++;
  }

  console.log(
    `Sensores del ESP32 para "${dispositivo.nombre}": ${creados} creados, ` +
      `${SENSORES_FIRMWARE.length - creados} ya existían`,
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
