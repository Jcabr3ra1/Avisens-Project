import * as bcrypt from 'bcrypt';
import type { PrismaClient } from '@prisma/client';
import {
  PERMISOS_POR_ROL,
  esPermisoConocido,
} from '../../src/common/auth/permisos';

export async function sembrarRoles(prisma: PrismaClient) {
  const rolAdmin = await prisma.rol.upsert({
    where: { nombre: 'Administrador' },
    update: {},
    create: {
      nombre: 'Administrador',
      descripcion: 'Control total del sistema',
    },
  });
  const rolPropietario = await prisma.rol.upsert({
    where: { nombre: 'Propietario' },
    update: {},
    create: { nombre: 'Propietario', descripcion: 'Gestiona sus granjas' },
  });
  const rolOperario = await prisma.rol.upsert({
    where: { nombre: 'Operario' },
    update: {},
    create: { nombre: 'Operario', descripcion: 'Registra datos de su galpón' },
  });

  const roles = [rolAdmin, rolPropietario, rolOperario];

  // roles_permisos es una proyección de PERMISOS_POR_ROL, no una fuente
  // paralela: se siembra desde el código y se limpia contra el código. Sin el
  // borrado de abajo, quitarle un permiso a un rol dejaba la fila vieja en la
  // base para siempre, y la tabla acababa diciendo algo que la API ya no hace.
  for (const rol of roles) {
    const esperados = PERMISOS_POR_ROL[rol.nombre] ?? [];
    const idsEsperados: number[] = [];

    for (const codigo of esperados) {
      const permiso = await prisma.permiso.upsert({
        where: { codigo },
        update: { activo: true },
        create: {
          codigo,
          modulo: codigo.split(':')[0],
          descripcion: `Permiso RBAC ${codigo}`,
        },
      });
      idsEsperados.push(permiso.id);

      await prisma.rolPermiso.upsert({
        where: {
          rol_id_permiso_id: { rol_id: rol.id, permiso_id: permiso.id },
        },
        update: {},
        create: { rol_id: rol.id, permiso_id: permiso.id },
      });
    }

    const sobrantes = await prisma.rolPermiso.deleteMany({
      where: { rol_id: rol.id, permiso_id: { notIn: idsEsperados } },
    });
    if (sobrantes.count > 0) {
      console.log(
        `${rol.nombre}: ${sobrantes.count} permiso(s) retirado(s) de roles_permisos`,
      );
    }
  }

  // Un permiso que ya no existe en el código queda inactivo en vez de
  // borrarse: la fila puede estar referenciada en auditorías viejas, y
  // desactivarla cuenta la historia sin romperlas.
  const conocidos = await prisma.permiso.findMany({
    select: { id: true, codigo: true, activo: true },
  });
  const idsDesconocidos = conocidos
    .filter((p) => p.activo && !esPermisoConocido(p.codigo))
    .map((p) => p.id);

  if (idsDesconocidos.length > 0) {
    await prisma.permiso.updateMany({
      where: { id: { in: idsDesconocidos } },
      data: { activo: false },
    });
    console.log(
      `${idsDesconocidos.length} permiso(s) desconocido(s) marcados inactivos`,
    );
  }

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
