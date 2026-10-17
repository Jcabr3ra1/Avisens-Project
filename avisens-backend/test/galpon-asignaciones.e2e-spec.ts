import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import type { Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { AuthModule } from '../src/modules/auth/auth.module';
import { GalponesModule } from '../src/modules/galpones/galpones.module';
import { GranjasModule } from '../src/modules/granjas/granjas.module';
import { LotesModule } from '../src/modules/lotes/lotes.module';
import { PlanLoteModule } from '../src/modules/plan-lote/plan-lote.module';
import { UsuariosGalponesModule } from '../src/modules/usuarios-galpones/usuarios-galpones.module';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PrismaExceptionFilter } from '../src/common/filters/prisma-exception.filter';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { validateEnv } from '../src/config/env.validation';

type Desactivacion = 'PATCH activo:false' | 'DELETE';
type Reactivacion = 'PATCH /activar' | 'PATCH activo:true';

describe('Galpón: desactivar revoca asignaciones por PATCH y DELETE (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let servidor: Server;
  let tokenAdmin: string;
  let tokenOperario: string;
  let operarioId: number;
  let granjaId: number;

  const sufijo = `${Date.now()}-${process.pid}`;
  const password = 'Prueba-e2e-123';
  const ids = {
    organizaciones: [] as number[],
    usuarios: [] as number[],
    granjas: [] as number[],
    galpones: [] as number[],
    lotes: [] as number[],
  };
  const triggersCreados: Array<{ nombre: string }> = [];
  let contador = 0;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  const crearEscenario = async () => {
    contador += 1;
    const [objetivo, otro] = await Promise.all(
      ['objetivo', 'otro'].map((nombre) =>
        prisma.galpon.create({
          data: {
            granja_id: granjaId,
            codigo: `GE2E-${sufijo}-${contador}-${nombre}`,
            nombre: `Galpón ${nombre}`,
            capacidad_aves: 300,
          },
        }),
      ),
    );
    ids.galpones.push(objetivo.id, otro.id);
    const lote = await prisma.lote.create({
      data: {
        galpon_id: objetivo.id,
        codigo: `E2E-LOTE-${randomUUID()}`,
        fecha_ingreso: new Date('2026-01-01'),
        cantidad_inicial: 100,
        estado: 'activo',
      },
    });
    ids.lotes.push(lote.id);
    await prisma.usuarioGalpon.createMany({
      data: [
        { usuario_id: operarioId, galpon_id: objetivo.id },
        { usuario_id: operarioId, galpon_id: otro.id },
      ],
    });
    return { objetivo: objetivo.id, otro: otro.id, lote: lote.id };
  };

  const asignacion = async (galponId: number) =>
    prisma.usuarioGalpon.findUnique({
      where: {
        usuario_id_galpon_id: { usuario_id: operarioId, galpon_id: galponId },
      },
      select: { activa: true },
    });

  const desactivar = (via: Desactivacion, galponId: number) =>
    via === 'DELETE'
      ? request(servidor)
          .delete(`/v1/galpones/${galponId}`)
          .set(auth(tokenAdmin))
      : request(servidor)
          .patch(`/v1/galpones/${galponId}`)
          .set(auth(tokenAdmin))
          .send({ activo: false });

  const reactivar = (via: Reactivacion, galponId: number) =>
    via === 'PATCH /activar'
      ? request(servidor)
          .patch(`/v1/galpones/${galponId}/activar`)
          .set(auth(tokenAdmin))
      : request(servidor)
          .patch(`/v1/galpones/${galponId}`)
          .set(auth(tokenAdmin))
          .send({ activo: true });

  const accesoDelOperario = async (galponId: number, loteId: number) => {
    const listado = await request(servidor)
      .get('/v1/galpones?limit=100')
      .set(auth(tokenOperario))
      .expect(200);
    const visibles = (
      JSON.parse(listado.text) as { data: Array<{ id: number }> }
    ).data.map((g) => g.id);
    const detalleGalpon = await request(servidor)
      .get(`/v1/galpones/${galponId}`)
      .set(auth(tokenOperario));
    const detalleLote = await request(servidor)
      .get(`/v1/lotes/${loteId}`)
      .set(auth(tokenOperario));
    const plan = await request(servidor)
      .get(`/v1/lotes/${loteId}/plan`)
      .set(auth(tokenOperario));
    return {
      enListado: visibles.includes(galponId),
      detalleGalpon: detalleGalpon.status,
      detalleLote: detalleLote.status,
      plan: plan.status,
      visibles,
    };
  };

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
        PrismaModule,
        AuthModule,
        GranjasModule,
        GalponesModule,
        LotesModule,
        PlanLoteModule,
        UsuariosGalponesModule,
      ],
    }).compile();
    app = modulo.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter(), new PrismaExceptionFilter());
    await app.init();
    servidor = app.getHttpServer() as Server;
    prisma = app.get(PrismaService);

    const [rolAdmin, rolPropietario, rolOperario] = await Promise.all(
      ['Administrador', 'Propietario', 'Operario'].map((nombre) =>
        prisma.rol.upsert({
          where: { nombre },
          update: {},
          create: { nombre },
        }),
      ),
    );
    const hash = await bcrypt.hash(password, 4);
    const org = await prisma.organizacion.create({
      data: { nombre: `E2E galpon ${sufijo}` },
    });
    ids.organizaciones.push(org.id);
    const crearUsuario = (
      rol_id: number,
      tipo: string,
      organizacion_id: number | null,
    ) =>
      prisma.usuario.create({
        data: {
          nombre_completo: tipo,
          cedula: `${tipo}-${sufijo}`,
          email: `${tipo}-${sufijo}@e2e.local`,
          password_hash: hash,
          rol_id,
          organizacion_id,
        },
      });
    const [admin, dueno, operario] = await Promise.all([
      crearUsuario(rolAdmin.id, 'admin', null),
      crearUsuario(rolPropietario.id, 'dueno', org.id),
      crearUsuario(rolOperario.id, 'operario', org.id),
    ]);
    ids.usuarios.push(admin.id, dueno.id, operario.id);
    operarioId = operario.id;
    const granja = await prisma.granja.create({
      data: {
        nombre: `Granja e2e ${sufijo}`,
        propietario_id: dueno.id,
        organizacion_id: org.id,
      },
    });
    ids.granjas.push(granja.id);
    granjaId = granja.id;

    const login = async (email: string) => {
      const res = await request(servidor)
        .post('/v1/auth/login')
        .send({ email, password })
        .expect(200);
      return (JSON.parse(res.text) as { access_token: string }).access_token;
    };
    tokenAdmin = await login(admin.email);
    tokenOperario = await login(operario.email);
  });

  afterEach(async () => {
    while (triggersCreados.length > 0) {
      const t = triggersCreados.pop()!;
      await prisma.$executeRawUnsafe(
        `DROP TRIGGER IF EXISTS "${t.nombre}" ON "galpones"`,
      );
      await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS "${t.nombre}"()`);
    }
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.usuarioGalpon.deleteMany({
        where: { usuario_id: { in: ids.usuarios } },
      });
      await prisma.planLote.deleteMany({
        where: { lote_id: { in: ids.lotes } },
      });
      await prisma.lote.deleteMany({ where: { id: { in: ids.lotes } } });
      await prisma.galpon.deleteMany({ where: { id: { in: ids.galpones } } });
      await prisma.granja.deleteMany({ where: { id: { in: ids.granjas } } });
      await prisma.sesion.deleteMany({
        where: { usuario_id: { in: ids.usuarios } },
      });
      await prisma.seguridadCuenta.deleteMany({
        where: { usuario_id: { in: ids.usuarios } },
      });
      await prisma.usuario.deleteMany({ where: { id: { in: ids.usuarios } } });
      await prisma.organizacion.deleteMany({
        where: { id: { in: ids.organizaciones } },
      });
    }
    await app?.close();
  });

  describe.each<Desactivacion>(['PATCH activo:false', 'DELETE'])(
    'desactivar por %s',
    (via) => {
      it('desactiva el galpón y sus asignaciones, y no toca el otro galpón', async () => {
        const e = await crearEscenario();
        const antes = await accesoDelOperario(e.objetivo, e.lote);
        expect(antes.enListado).toBe(true);
        expect(antes.detalleGalpon).toBe(200);
        expect(antes.detalleLote).toBe(200);
        expect(antes.plan).toBe(404);

        await desactivar(via, e.objetivo).expect(200);

        const galpon = await prisma.galpon.findUniqueOrThrow({
          where: { id: e.objetivo },
          select: { activo: true },
        });
        expect(galpon.activo).toBe(false);
        expect((await asignacion(e.objetivo))?.activa).toBe(false);
        expect((await asignacion(e.otro))?.activa).toBe(true);

        const despues = await accesoDelOperario(e.objetivo, e.lote);
        expect(despues.enListado).toBe(false);
        expect(despues.detalleGalpon).toBe(403);
        expect(despues.detalleLote).toBe(403);
        expect(despues.plan).toBe(403);
        expect(despues.visibles).toContain(e.otro);
      });

      it.each<Reactivacion>(['PATCH /activar', 'PATCH activo:true'])(
        'reactivar por %s no devuelve el acceso; reasignar explícitamente sí',
        async (viaReactivar) => {
          const e = await crearEscenario();
          await desactivar(via, e.objetivo).expect(200);

          await reactivar(viaReactivar, e.objetivo).expect(200);

          expect(
            (
              await prisma.galpon.findUniqueOrThrow({
                where: { id: e.objetivo },
                select: { activo: true },
              })
            ).activo,
          ).toBe(true);
          expect((await asignacion(e.objetivo))?.activa).toBe(false);
          const sinReasignar = await accesoDelOperario(e.objetivo, e.lote);
          expect(sinReasignar.enListado).toBe(false);
          expect(sinReasignar.detalleGalpon).toBe(403);
          expect(sinReasignar.detalleLote).toBe(403);
          expect(sinReasignar.plan).toBe(403);

          await request(servidor)
            .post('/v1/usuarios-galpones')
            .set(auth(tokenAdmin))
            .send({ usuario_id: operarioId, galpon_id: e.objetivo })
            .expect(201);

          expect((await asignacion(e.objetivo))?.activa).toBe(true);
          const reasignado = await accesoDelOperario(e.objetivo, e.lote);
          expect(reasignado.enListado).toBe(true);
          expect(reasignado.detalleGalpon).toBe(200);
          expect(reasignado.detalleLote).toBe(200);
          expect(reasignado.plan).toBe(404);
        },
      );
    },
  );

  describe('PATCH que no desactiva', () => {
    it('sin activo, o con activo:true sobre un galpón activo, no modifica asignaciones', async () => {
      const e = await crearEscenario();

      await request(servidor)
        .patch(`/v1/galpones/${e.objetivo}`)
        .set(auth(tokenAdmin))
        .send({ nombre: 'Solo nombre' })
        .expect(200);
      await request(servidor)
        .patch(`/v1/galpones/${e.objetivo}`)
        .set(auth(tokenAdmin))
        .send({ activo: true, capacidad_aves: 450 })
        .expect(200);

      expect((await asignacion(e.objetivo))?.activa).toBe(true);
      expect((await asignacion(e.otro))?.activa).toBe(true);
      const acceso = await accesoDelOperario(e.objetivo, e.lote);
      expect(acceso.enListado).toBe(true);
      expect(acceso.detalleGalpon).toBe(200);
    });
  });

  describe('PATCH activo:false conserva el resto de campos y la respuesta', () => {
    it('guarda los demás campos enviados y devuelve el galpón completo', async () => {
      const e = await crearEscenario();

      const res = await request(servidor)
        .patch(`/v1/galpones/${e.objetivo}`)
        .set(auth(tokenAdmin))
        .send({ activo: false, nombre: 'Renombrado', capacidad_aves: 777 })
        .expect(200);

      const cuerpo = JSON.parse(res.text) as {
        id: number;
        nombre: string;
        capacidad_aves: number;
        activo: boolean;
        granja: { id: number };
      };
      expect(cuerpo).toMatchObject({
        id: e.objetivo,
        nombre: 'Renombrado',
        capacidad_aves: 777,
        activo: false,
      });
      expect(cuerpo.granja.id).toBe(granjaId);
      expect((await asignacion(e.objetivo))?.activa).toBe(false);
    });
  });

  describe('rollback si falla la actualización del galpón', () => {
    it('PATCH activo:false falla por un trigger del fixture: ni el galpón ni las asignaciones cambian', async () => {
      const e = await crearEscenario();
      const nombre = `e2e_falla_galpon_${e.objetivo}`;
      triggersCreados.push({ nombre });
      await prisma.$executeRawUnsafe(`
        CREATE FUNCTION "${nombre}"() RETURNS trigger AS $$
        BEGIN
          IF NEW.id = ${e.objetivo} THEN
            RAISE EXCEPTION 'falla simulada de prueba e2e';
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
      `);
      await prisma.$executeRawUnsafe(`
        CREATE TRIGGER "${nombre}" BEFORE UPDATE ON "galpones"
        FOR EACH ROW EXECUTE FUNCTION "${nombre}"()
      `);

      const res = await request(servidor)
        .patch(`/v1/galpones/${e.objetivo}`)
        .set(auth(tokenAdmin))
        .send({ activo: false, nombre: 'No debe guardarse' });

      expect(res.status).toBeGreaterThanOrEqual(400);
      const galpon = await prisma.galpon.findUniqueOrThrow({
        where: { id: e.objetivo },
        select: { activo: true, nombre: true },
      });
      expect(galpon).toEqual({ activo: true, nombre: 'Galpón objetivo' });
      expect((await asignacion(e.objetivo))?.activa).toBe(true);
      expect((await asignacion(e.otro))?.activa).toBe(true);
    });
  });
});
