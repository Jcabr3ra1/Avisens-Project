import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { sembrarRoles, sembrarAdmin } from './seed-auth';
import { sembrarCurvasObjetivo } from './seed-curvas';
import {
  sembrarMatrizCalificacion,
  sembrarPreguntasChatbot,
  sembrarCatalogoSensores,
} from './seed-chatbot';
import { sembrarCategoriasFinancieras } from './seed-finanzas';

const adapter = new PrismaPg({
  connectionString: process.env['DATABASE_URL']!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const rolAdmin = await sembrarRoles(prisma);
  await sembrarAdmin(prisma, rolAdmin.id);
  await sembrarCurvasObjetivo(prisma);
  await sembrarMatrizCalificacion(prisma);
  await sembrarPreguntasChatbot(prisma);
  await sembrarCategoriasFinancieras(prisma);
  await sembrarCatalogoSensores(prisma);
  console.log('Seed completado');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
