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
import { TiposAlimentoModule } from '../src/modules/tipos-alimento/tipos-alimento.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaExceptionFilter } from '../src/common/filters/prisma-exception.filter';

// Contra Postgres real: consumos_diarios.tipo_alimento_id pasó de ON DELETE
// SET NULL a RESTRICT (migracion 20260926031310) precisamente para que un
// tipo de alimento con historial de consumo no se pueda borrar en silencio.
// Se prueban dos capas por separado: la FK misma (sin pasar por HTTP) y la
// respuesta que de verdad recibe quien llama a la API (con los filtros
// globales reales, iguales a los de main.ts).
describe('TiposAlimento · eliminarPermanente respeta el historial de ConsumoDiario (e2e, Postgres real)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let servidor: Server;
  let token: string;

  const sufijo = `${Date.now()}-${process.pid}`;

  const ids = {
    organizacion: 0,
    usuario: 0,
    granja: 0,
    galpon: 0,
    lote: 0,
    tipoUsado: 0,
    tipoSinUso: 0,
    consumo: 0,
  };

  beforeAll(async () => {
    const modulo: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
        PrismaModule,
        JwtModule.register({ secret: process.env.JWT_SECRET }),
        TiposAlimentoModule,
      ],
      providers: [JwtStrategy],
    }).compile();

    app = modulo.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    // Mismos dos filtros y mismo orden que main.ts: son los que de verdad
    // deciden qué le llega al usuario cuando la FK rechaza el borrado.
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
      data: { nombre: `Org tipo-alimento ${sufijo}` },
    });
    ids.organizacion = organizacion.id;

    const usuario = await prisma.usuario.create({
      data: {
        rol_id: rolAdmin.id,
        organizacion_id: organizacion.id,
        nombre_completo: 'Admin tipo-alimento e2e',
        cedula: `TA-${sufijo}`,
        email: `tipo-alimento-${sufijo}@e2e.test`,
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
        nombre: `Granja tipo-alimento ${sufijo}`,
      },
    });
    ids.granja = granja.id;

    const galpon = await prisma.galpon.create({
      data: {
        granja_id: granja.id,
        codigo: 'galpon-tipo-alimento',
        nombre: 'Galpón tipo-alimento e2e',
      },
    });
    ids.galpon = galpon.id;

    const lote = await prisma.lote.create({
      data: {
        galpon_id: galpon.id,
        codigo: `LOT-TA-${sufijo}`,
        fecha_ingreso: new Date('2026-05-01'),
        cantidad_inicial: 1000,
      },
    });
    ids.lote = lote.id;

    const tipoUsado = await prisma.tipoAlimento.create({
      data: { nombre: `Alimento con historial ${sufijo}` },
    });
    ids.tipoUsado = tipoUsado.id;

    const tipoSinUso = await prisma.tipoAlimento.create({
      data: { nombre: `Alimento sin uso ${sufijo}` },
    });
    ids.tipoSinUso = tipoSinUso.id;

    const consumo = await prisma.consumoDiario.create({
      data: {
        lote_id: lote.id,
        tipo_alimento_id: tipoUsado.id,
        usuario_id: usuario.id,
        fecha: new Date('2026-06-01'),
        alimento_kg: 50,
      },
    });
    ids.consumo = consumo.id;
  });

  afterAll(async () => {
    // Orden importa: hay que borrar el consumo ANTES que el tipo de
    // alimento, o el mismo RESTRICT que este test verifica bloquearia la
    // limpieza.
    await prisma.consumoDiario.deleteMany({ where: { lote_id: ids.lote } });
    await prisma.tipoAlimento.deleteMany({
      where: { id: { in: [ids.tipoUsado, ids.tipoSinUso] } },
    });
    await prisma.lote.delete({ where: { id: ids.lote } });
    await prisma.galpon.delete({ where: { id: ids.galpon } });
    await prisma.granja.delete({ where: { id: ids.granja } });
    await prisma.usuario.delete({ where: { id: ids.usuario } });
    await prisma.organizacion.delete({ where: { id: ids.organizacion } });
    await app.close();
  });

  it('el borrado directo con Prisma es rechazado por la FK -- sin pasar por el servicio ni por HTTP', async () => {
    await expect(
      prisma.tipoAlimento.delete({ where: { id: ids.tipoUsado } }),
    ).rejects.toThrow();

    const consumo = await prisma.consumoDiario.findUniqueOrThrow({
      where: { id: ids.consumo },
    });
    expect(consumo.tipo_alimento_id).toBe(ids.tipoUsado);
  });

  it('DELETE /v1/tipos-alimento/:id/permanente responde 409 con el mensaje real cuando hay consumos asociados', async () => {
    const res = await request(servidor)
      .delete(`/v1/tipos-alimento/${ids.tipoUsado}/permanente`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(409);
    const cuerpo = res.body as { message?: string };
    expect(cuerpo.message).toMatch(/consumos diarios/i);

    const consumo = await prisma.consumoDiario.findUniqueOrThrow({
      where: { id: ids.consumo },
    });
    expect(consumo.tipo_alimento_id).toBe(ids.tipoUsado);
  });

  it('un tipo de alimento nunca usado sí se puede eliminar', async () => {
    const res = await request(servidor)
      .delete(`/v1/tipos-alimento/${ids.tipoSinUso}/permanente`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);

    const sigueExistiendo = await prisma.tipoAlimento.findUnique({
      where: { id: ids.tipoSinUso },
    });
    expect(sigueExistiendo).toBeNull();
  });
});
