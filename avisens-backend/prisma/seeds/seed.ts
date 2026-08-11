import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({
  connectionString: process.env['DATABASE_URL']!,
});
const prisma = new PrismaClient({ adapter });

// Crea los tres roles del sistema. No son secretos: la app los necesita para
// funcionar, así que se siembran siempre (idempotente con upsert).
async function sembrarRoles() {
  const rolAdmin = await prisma.rol.upsert({
    where: { nombre: 'Administrador' },
    update: {},
    create: { nombre: 'Administrador', descripcion: 'Control total del sistema' },
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

// Crea el ÚNICO administrador (Avisens) a partir de variables de entorno.
// Nunca hay credenciales quemadas en el código: si no se configuran, no se crea.
async function sembrarAdmin(rolAdminId: number) {
  const email = process.env['ADMIN_EMAIL'];
  const password = process.env['ADMIN_PASSWORD'];

  // Sin configurar → no se crea admin (solo quedaron los roles). Es válido.
  if (!email && !password) {
    console.warn(
      'ADMIN_EMAIL / ADMIN_PASSWORD no definidos: no se crea administrador ' +
        '(solo se sembraron los roles).',
    );
    return;
  }

  // Configuración a medias o débil → falla fuerte (mejor romper que dejar un hueco).
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
  // Nunca se imprime la contraseña.
  console.log(`Administrador creado: ${email}`);
}

const CURVA_OBJETIVO = [
  {sexo: 'macho', dia: 7, peso_esperado_g: 211, consumo_acumulado_g: 164, fcr_objetivo: 0.78, etapa_alimentacion: 'preiniciador', temperatura_min: 28, temperatura_max: 30},
  {sexo: 'macho', dia: 14, peso_esperado_g: 535, consumo_acumulado_g: 551, fcr_objetivo: 1.03, etapa_alimentacion: 'iniciacion', temperatura_min: 28, temperatura_max: 28},
  {sexo: 'macho', dia: 21, peso_esperado_g: 1035, consumo_acumulado_g: 1218, fcr_objetivo: 1.18, etapa_alimentacion: 'iniciacion', temperatura_min: 26, temperatura_max: 26},
  {sexo: 'macho', dia: 28, peso_esperado_g: 1681, consumo_acumulado_g: 2199, fcr_objetivo: 1.31, etapa_alimentacion: 'engorde', temperatura_min: null, temperatura_max: null},
  {sexo: 'macho', dia: 35, peso_esperado_g: 2421, consumo_acumulado_g: 3483, fcr_objetivo: 1.44, etapa_alimentacion: 'engorde', temperatura_min: null, temperatura_max: null},
  {sexo: 'macho', dia: 42, peso_esperado_g: 3100, consumo_acumulado_g: 5023, fcr_objetivo: 1.57, etapa_alimentacion: 'engorde', temperatura_min: null, temperatura_max: null},

  {sexo: 'hembra', dia: 7, peso_esperado_g: 211, consumo_acumulado_g: 178, fcr_objetivo: 0.84, etapa_alimentacion: 'preiniciador', temperatura_min: 28, temperatura_max: 30},
  {sexo: 'hembra', dia: 14, peso_esperado_g: 523, consumo_acumulado_g: 555, fcr_objetivo: 1.06, etapa_alimentacion: 'iniciacion', temperatura_min: 28, temperatura_max: 28},
  {sexo: 'hembra', dia: 21, peso_esperado_g: 980, consumo_acumulado_g: 1177, fcr_objetivo: 1.20, etapa_alimentacion: 'iniciacion', temperatura_min: 26, temperatura_max: 26},
  {sexo: 'hembra', dia: 28, peso_esperado_g: 1548, consumo_acumulado_g: 2069, fcr_objetivo: 1.33, etapa_alimentacion: 'engorde', temperatura_min: null, temperatura_max: null},
  {sexo: 'hembra', dia: 35, peso_esperado_g: 2176, consumo_acumulado_g: 3213, fcr_objetivo: 1.48, etapa_alimentacion: 'engorde', temperatura_min: null, temperatura_max: null},
  {sexo: 'hembra', dia: 42, peso_esperado_g: 2700, consumo_acumulado_g: 4557, fcr_objetivo: 1.62, etapa_alimentacion: 'engorde', temperatura_min: null, temperatura_max: null},

];

async function sembrarCurvasObjetivo() {
  for(const fila of CURVA_OBJETIVO){
    await prisma.curvaObjetivo.upsert({
      where:{ sexo_dia: {sexo: fila.sexo, dia: fila.dia}},
      update: fila,
      create: fila,
    });
  }
}

async function main() {
  const rolAdmin = await sembrarRoles();
  await sembrarAdmin(rolAdmin.id);
  await sembrarCurvasObjetivo();
  console.log('Seed completado');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
