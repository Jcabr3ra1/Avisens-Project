import * as bcrypt from 'bcrypt';
import type { PrismaClient } from '@prisma/client';

export async function sembrarRoles(prisma: PrismaClient) {
  const rolAdmin = await prisma.rol.upsert({
    where: { nombre: 'Administrador' },
    update: {},
    create: {
      nombre: 'Administrador',
      descripcion: 'Control total del sistema',
    },
  });
  await prisma.rol.upsert({
    where: { nombre: 'Propietario' },
    update: {},
    create: { nombre: 'Propietario', descripcion: 'Gestiona sus granjas' },
  });
  await prisma.rol.upsert({
    where: { nombre: 'Operario' },
    update: {},
    create: { nombre: 'Operario', descripcion: 'Registra datos de su galpón' },
  });
  return rolAdmin;
}

export async function sembrarAdmin(prisma: PrismaClient, rolAdminId: number) {
  const email = process.env['ADMIN_EMAIL'];
  const password = process.env['ADMIN_PASSWORD'];

  if (!email && !password) {
    console.warn(
      'ADMIN_EMAIL / ADMIN_PASSWORD no definidos: no se crea administrador ' +
        '(solo se sembraron los roles).',
    );
    return;
  }

  if (!email || !password) {
    throw new Error(
      'Define AMBAS variables ADMIN_EMAIL y ADMIN_PASSWORD para crear el administrador.',
    );
  }
  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD debe tener al menos 8 caracteres.');
  }

  const nombre = process.env['ADMIN_NOMBRE'] ?? 'Administrador Avisens';
  const cedula = process.env['ADMIN_CEDULA'] ?? '0000000000';

  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) {
    console.log(`El administrador ya existe (${email}); no se modifica.`);
    return;
  }

  await prisma.usuario.create({
    data: {
      nombre_completo: nombre,
      cedula,
      email,
      password_hash: await bcrypt.hash(password, 12),
      rol_id: rolAdminId,
    },
  });
  console.log(`Administrador creado: ${email}`);
}
