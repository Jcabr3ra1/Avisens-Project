import type { PrismaClient } from '@prisma/client';

const DIAS_MEDIDOS = [7, 14, 21, 28];

const LOTES_DEMO = [
  {
    codigo: 'L-DEMO-01',
    galpon_codigo: 'GD-01',
    galpon_nombre: 'Galpon 1 (demo)',
    cantidad_inicial: 1000,
    pesos_g: [205, 540, 1040, 1690],
    alimento_kg: [164, 387, 667, 981],
    muertes: [8, 4, 3, 3],
  },
  {
    codigo: 'L-DEMO-02',
    galpon_codigo: 'GD-02',
    galpon_nombre: 'Galpon 2 (demo)',
    cantidad_inicial: 1000,
    pesos_g: [180, 450, 850, 1350],
    alimento_kg: [170, 400, 700, 1000],
    muertes: [20, 25, 30, 35],
  },
];

function hace(dias: number) {
  const f = new Date();
  f.setUTCDate(f.getUTCDate() - dias);
  f.setUTCHours(0, 0, 0, 0);
  return f;
}

export async function sembrarDatosDemo(
  prisma: import('@prisma/client').PrismaClient,
) {
  if (process.env.SEED_DEMO !== 'true') return;

  const admin = await prisma.usuario.findFirst({ orderBy: { id: 'asc' } });
  if (!admin) {
    console.log('Seed demo omitido: no hay usuario admin');
    return;
  }

  let organizacionId = admin.organizacion_id;
  if (!organizacionId) {
    const organizacion = await prisma.organizacion.create({
      data: { nombre: 'Organización demo Avisens' },
      select: { id: true },
    });
    organizacionId = organizacion.id;
    await prisma.usuario.update({
      where: { id: admin.id },
      data: { organizacion_id: organizacionId },
    });
  }

  const proveedor = await prisma.proveedor.upsert({
    where: { id: 1 },
    update: {},
    create: {
      nombre: 'Incubadora Santander (demo)',
      nit: '900123456-1',
      tipo_proveedor: 'pollitos',
    },
  });

  let granja = await prisma.granja.findFirst({
    where: { nombre: 'Granja La Esperanza (demo)' },
  });
  granja ??= await prisma.granja.create({
    data: {
      propietario_id: admin.id,
      organizacion_id: organizacionId,
      nombre: 'Granja La Esperanza (demo)',
      municipio: 'Piedecuesta',
      departamento: 'Santander',
    },
  });

  const ingreso = hace(28);

  for (const demo of LOTES_DEMO) {
    const galpon = await prisma.galpon.upsert({
      where: {
        granja_id_codigo: {
          granja_id: granja.id,
          codigo: demo.galpon_codigo,
        },
      },
      update: {},
      create: {
        granja_id: granja.id,
        codigo: demo.galpon_codigo,
        nombre: demo.galpon_nombre,
        capacidad_aves: 1200,
        largo_metros: 60,
        ancho_metros: 20,
      },
    });

    const lote = await prisma.lote.upsert({
      where: { codigo: demo.codigo },
      update: { fecha_ingreso: ingreso },
      create: {
        galpon_id: galpon.id,
        proveedor_id: proveedor.id,
        codigo: demo.codigo,
        fecha_ingreso: ingreso,
        cantidad_inicial: demo.cantidad_inicial,
        raza: 'Cobb 500',
        sexo: 'macho',
        marca_alimento: 'italcol',
        costo_pollito_unitario: 1800,
        estado: 'activo',
      },
    });

    await prisma.pesaje.deleteMany({ where: { lote_id: lote.id } });
    await prisma.consumoDiario.deleteMany({ where: { lote_id: lote.id } });
    await prisma.registroMortalidad.deleteMany({ where: { lote_id: lote.id } });

    await prisma.pesaje.createMany({
      data: DIAS_MEDIDOS.map((dia, i) => ({
        lote_id: lote.id,
        usuario_id: admin.id,
        fecha: hace(28 - dia),
        peso_promedio_g: demo.pesos_g[i],
        cantidad_aves_pesadas: 50,
        metodo_registro: 'manual',
      })),
    });

    await prisma.consumoDiario.createMany({
      data: DIAS_MEDIDOS.map((dia, i) => ({
        lote_id: lote.id,
        usuario_id: admin.id,
        fecha: hace(28 - dia),
        alimento_kg: demo.alimento_kg[i],
        agua_litros: demo.alimento_kg[i] * 1.8,
        metodo_registro: 'manual',
      })),
    });

    await prisma.registroMortalidad.createMany({
      data: DIAS_MEDIDOS.map((dia, i) => ({
        lote_id: lote.id,
        usuario_id: admin.id,
        fecha: hace(28 - dia),
        cantidad_aves: demo.muertes[i],
        causa_presuntiva: 'sin determinar',
        metodo_registro: 'manual',
      })),
    });

    console.log(`Demo: lote ${demo.codigo} sembrado (id ${lote.id})`);
  }
}
