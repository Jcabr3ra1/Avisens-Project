import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({
  connectionString: process.env['DATABASE_URL']!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const roles = await Promise.all([
    prisma.rol.upsert({
      where: { nombre: 'Administrador' },
      update: {},
      create: { nombre: 'Administrador', descripcion: 'Control total del sistema' },
    }),
    prisma.rol.upsert({
      where: { nombre: 'Propietario' },
      update: {},
      create: { nombre: 'Propietario', descripcion: 'Gestiona sus granjas' },
    }),
    prisma.rol.upsert({
      where: { nombre: 'Operario' },
      update: {},
      create: { nombre: 'Operario', descripcion: 'Registra datos de su galpón' },
    }),
  ]);

  const rolAdmin = roles[0];

  const adminExistente = await prisma.usuario.findUnique({ where: { email: 'admin@avisens.com' } });
  if (!adminExistente) {
    await prisma.usuario.create({
      data: {
        nombre_completo: 'Administrador Avisens',
        cedula: '0000000000',
        email: 'admin@avisens.com',
        password_hash: await bcrypt.hash('Admin1234!', 12),
        rol_id: rolAdmin.id,
      },
    });
    console.log('Admin creado: admin@avisens.com / Admin1234!');
  } else {
    console.log('Admin ya existe, no se modificó');
  }

  console.log('Seed completado');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
