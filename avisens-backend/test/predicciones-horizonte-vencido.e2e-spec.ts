import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import request from 'supertest';
import type { Server } from 'node:http';
import { validateEnv } from '../src/config/env.validation';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { PrediccionesModule } from '../src/modules/predicciones/predicciones.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaExceptionFilter } from '../src/common/filters/prisma-exception.filter';

// Contra Postgres real, con los mismos filtros globales de main.ts: el
// filtro reconstruye el cuerpo de la respuesta desde cero (statusCode,
// message, timestamp, path, requestId) y descartaba cualquier otro campo,
// asi que codigo/dia_faena/ultimo_dia_observado del 422 de horizonte_vencido
// nunca le llegaban a quien llama a la API -- solo un mock del filtro no lo
// hubiera mostrado, porque no pasa por el filtro de verdad. PrediccionesModule
// importa PlanLoteModule internamente, asi que basta importar el primero para
// que PlanLoteService quede disponible via el DI real (no un mock).
describe('Predicciones · 422 con cuerpo completo por HTTP (e2e, Postgres real)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let servidor: Server;
  let token: string;

  const sufijo = `${Date.now()}-${process.pid}`;
  const fechaIngreso = new Date('2026-07-01');

  const ids = {
    organizacion: 0,
    usuario: 0,
    granja: 0,
    galpon: 0,
    galponSinPlan: 0,
    lineaGenetica: 0,
    curva: 0,
    lote: 0,
    loteSinPlan: 0,
  };

  beforeAll(async () => {
    const modulo: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
        PrismaModule,
        JwtModule.register({ secret: process.env.JWT_SECRET }),
        PrediccionesModule,
      ],
      providers: [JwtStrategy],
    }).compile();

    app = modulo.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    // Mismos filtros y mismo orden que main.ts: son los que de verdad
    // deciden que cuerpo recibe quien llama a la API.
    app.useGlobalFilters(
      new HttpExceptionFilter(),
      new PrismaExceptionFilter(),
    );
    await app.init();
    servidor = app.getHttpServer() as Server;

    prisma = modulo.get(PrismaService);
    const jwt = modulo.get(JwtService);

    const rolAdmin = await prisma.rol.upsert({
      where: { nombre: 'Administrador' },
      update: {},
      create: { nombre: 'Administrador' },
    });

    const organizacion = await prisma.organizacion.create({
      data: { nombre: `Org horizonte-vencido ${sufijo}` },
    });
    ids.organizacion = organizacion.id;

    const usuario = await prisma.usuario.create({
      data: {
        rol_id: rolAdmin.id,
        organizacion_id: organizacion.id,
        nombre_completo: 'Admin horizonte-vencido e2e',
        cedula: `HV-${sufijo}`,
        email: `horizonte-vencido-${sufijo}@e2e.test`,
        password_hash: 'no-se-usa-en-este-test',
      },
    });
    ids.usuario = usuario.id;

    token = jwt.sign({
      sub: usuario.id,
      email: usuario.email,
      rol: 'Administrador',
      organizacion_id: organizacion.id,
    });

    const granja = await prisma.granja.create({
      data: {
        propietario_id: usuario.id,
        organizacion_id: organizacion.id,
        nombre: `Granja horizonte-vencido ${sufijo}`,
      },
    });
    ids.granja = granja.id;

    const galpon = await prisma.galpon.create({
      data: {
        granja_id: granja.id,
        codigo: 'galpon-horizonte-vencido',
        nombre: 'Galpón horizonte-vencido e2e',
      },
    });
    ids.galpon = galpon.id;

    // Un PlanLote con estado_dia='calculado' exige, por constraint de base
    // de datos, linea_genetica_id_snapshot y curva_version_id no nulos --
    // hace falta una linea y una curva vigente reales, no solo el plan.
    // codigo canonico exige minusculas y solo [a-z0-9_] -- sufijo trae un
    // guion (Date.now()-pid) que hay que cambiar por guion bajo.
    const lineaGenetica = await prisma.lineaGenetica.create({
      data: {
        codigo: `lg_hv_${sufijo.replace(/-/g, '_')}`,
        nombre: 'Linea e2e horizonte-vencido',
      },
    });
    ids.lineaGenetica = lineaGenetica.id;

    const curva = await prisma.curvaGeneticaVersion.create({
      data: {
        linea_genetica_id: lineaGenetica.id,
        sexo: 'mixto',
        version: 1,
        estado: 'publicada',
        vigente: true,
        fuente: 'seed-e2e',
        fecha_publicacion: new Date(),
      },
    });
    ids.curva = curva.id;

    const lote = await prisma.lote.create({
      data: {
        galpon_id: galpon.id,
        codigo: `LOT-HV-${sufijo}`,
        fecha_ingreso: fechaIngreso,
        cantidad_inicial: 1000,
        linea_genetica_id: lineaGenetica.id,
        sexo: 'mixto',
      },
    });
    ids.lote = lote.id;

    // El snapshot (linea, sexo, fecha de ingreso, curva) coincide con el
    // lote y la curva vigente actual, asi que esDesactualizado() da false.
    await prisma.planLote.create({
      data: {
        lote_id: lote.id,
        version: 1,
        vigente: true,
        peso_objetivo_g: 2400,
        estado_dia: 'calculado',
        curva_version_id: curva.id,
        linea_genetica_id_snapshot: lineaGenetica.id,
        sexo_curva_snapshot: 'mixto',
        fecha_ingreso_snapshot: fechaIngreso,
        dia_objetivo: 42,
        dia_objetivo_interpolado: 42,
        fecha_salida_calculada: new Date('2026-08-11'),
        creado_por_id: usuario.id,
      },
    });

    // fecha_ingreso 2026-07-01 = dia 1. dia 41 -> 2026-08-10, dia 42 ->
    // 08-11, dia 43 -> 08-12. El plan pide dia_objetivo=42, asi que el
    // ultimo pesaje (dia 43) ya vencio el horizonte.
    await prisma.pesaje.createMany({
      data: [
        {
          lote_id: lote.id,
          usuario_id: usuario.id,
          fecha: new Date('2026-08-10'),
          peso_promedio_g: 3000,
        },
        {
          lote_id: lote.id,
          usuario_id: usuario.id,
          fecha: new Date('2026-08-11'),
          peso_promedio_g: 3100,
        },
        {
          lote_id: lote.id,
          usuario_id: usuario.id,
          fecha: new Date('2026-08-12'),
          peso_promedio_g: 3200,
        },
      ],
    });

    // galpon_id es unico en Lote (un galpon, un lote), asi que el lote
    // hermano -- sin ningun PlanLote, el otro 422 nuevo de este hito --
    // necesita su propio galpon.
    const galponSinPlan = await prisma.galpon.create({
      data: {
        granja_id: granja.id,
        codigo: 'galpon-sin-plan',
        nombre: 'Galpón sin plan e2e',
      },
    });
    ids.galponSinPlan = galponSinPlan.id;

    const loteSinPlan = await prisma.lote.create({
      data: {
        galpon_id: galponSinPlan.id,
        codigo: `LOT-SP-${sufijo}`,
        fecha_ingreso: fechaIngreso,
        cantidad_inicial: 1000,
      },
    });
    ids.loteSinPlan = loteSinPlan.id;
  });

  afterAll(async () => {
    await prisma.pesaje.deleteMany({ where: { lote_id: ids.lote } });
    await prisma.planLote.deleteMany({ where: { lote_id: ids.lote } });
    await prisma.lote.delete({ where: { id: ids.lote } });
    await prisma.lote.delete({ where: { id: ids.loteSinPlan } });
    await prisma.curvaGeneticaVersion.delete({ where: { id: ids.curva } });
    await prisma.lineaGenetica.delete({ where: { id: ids.lineaGenetica } });
    await prisma.galpon.delete({ where: { id: ids.galponSinPlan } });
    await prisma.galpon.delete({ where: { id: ids.galpon } });
    await prisma.granja.delete({ where: { id: ids.granja } });
    await prisma.usuario.delete({ where: { id: ids.usuario } });
    await prisma.organizacion.delete({ where: { id: ids.organizacion } });
    await app.close();
  });

  it('GET /v1/predicciones/:loteId responde 422 horizonte_vencido con el cuerpo completo (codigo, dia_faena, ultimo_dia_observado), no solo el message', async () => {
    const res = await request(servidor)
      .get(`/v1/predicciones/${ids.lote}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({
      statusCode: 422,
      codigo: 'horizonte_vencido',
      dia_faena: 42,
      ultimo_dia_observado: 43,
    });
    const cuerpo = res.body as { message?: string };
    expect(cuerpo.message).toMatch(/43/);
    expect(cuerpo.message).toMatch(/42/);

    const guardadas = await prisma.prediccion.count({
      where: { lote_id: ids.lote },
    });
    expect(guardadas).toBe(0);
  });

  it('GET /v1/predicciones/:loteId con un lote sin plan vigente responde 422 sin_plan_utilizable con estado_plan', async () => {
    const res = await request(servidor)
      .get(`/v1/predicciones/${ids.loteSinPlan}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({
      statusCode: 422,
      codigo: 'sin_plan_utilizable',
      estado_plan: 'sin_plan',
    });
  });
});
