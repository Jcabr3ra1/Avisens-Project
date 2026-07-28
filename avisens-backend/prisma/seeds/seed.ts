import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({
  connectionString: process.env['DATABASE_URL']!,
});
const prisma = new PrismaClient({ adapter });

// Crea un usuario si no existe (idempotente: seguro de correr en cada arranque).
async function crearUsuario(datos: {
  nombre_completo: string;
  cedula: string;
  email: string;
  password: string;
  rol_id: number;
}) {
  const existente = await prisma.usuario.findUnique({
    where: { email: datos.email },
  });
  if (existente) {
    console.log(`Usuario ya existe: ${datos.email}`);
    return;
  }
  await prisma.usuario.create({
    data: {
      nombre_completo: datos.nombre_completo,
      cedula: datos.cedula,
      email: datos.email,
      password_hash: await bcrypt.hash(datos.password, 12),
      rol_id: datos.rol_id,
    },
  });
  console.log(`Usuario creado: ${datos.email} / ${datos.password}`);
}

async function main() {
  const [rolAdmin, rolPropietario, rolOperario] = await Promise.all([
    prisma.rol.upsert({
      where: { nombre: 'Administrador' },
      update: {},
      create: {
        nombre: 'Administrador',
        descripcion: 'Control total del sistema',
      },
    }),
    prisma.rol.upsert({
      where: { nombre: 'Propietario' },
      update: {},
      create: { nombre: 'Propietario', descripcion: 'Gestiona sus granjas' },
    }),
    prisma.rol.upsert({
      where: { nombre: 'Operario' },
      update: {},
      create: {
        nombre: 'Operario',
        descripcion: 'Registra datos de su galpón',
      },
    }),
  ]);

  // Un usuario de prueba por cada rol, para probar los accesos de cada uno.
  await crearUsuario({
    nombre_completo: 'Administrador Avisens',
    cedula: '0000000000',
    email: 'admin@avisens.com',
    password: 'Admin1234!',
    rol_id: rolAdmin.id,
  });
  await crearUsuario({
    nombre_completo: 'Propietario Demo',
    cedula: '1111111111',
    email: 'propietario@avisens.com',
    password: 'Propietario1234!',
    rol_id: rolPropietario.id,
  });
  await crearUsuario({
    nombre_completo: 'Operario Demo',
    cedula: '2222222222',
    email: 'operario@avisens.com',
    password: 'Operario1234!',
    rol_id: rolOperario.id,
  });

  console.log('Seed completado');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
