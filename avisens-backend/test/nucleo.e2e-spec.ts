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
import { AuthModule } from '../src/modules/auth/auth.module';
import { GalponesModule } from '../src/modules/galpones/galpones.module';
import { GranjasModule } from '../src/modules/granjas/granjas.module';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { validateEnv } from '../src/config/env.validation';

describe('Núcleo multi-tenant (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let servidor: Server;
  let token: string;
  const ids = {
    organizaciones: [] as number[],
    usuarios: [] as number[],
    granjas: [] as number[],
    galpones: [] as number[],
    dispositivo: 0,
  };
  const sufijo = `${Date.now()}-${process.pid}`;
  const password = 'Prueba-e2e-123';

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
        PrismaModule,
        AuthModule,
        GranjasModule,
        GalponesModule,
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
    await app.init();
    servidor = app.getHttpServer() as Server;
    prisma = app.get(PrismaService);

    const [rolPropietario, rolOperario] = await Promise.all([
      prisma.rol.upsert({
        where: { nombre: 'Propietario' },
        update: {},
        create: { nombre: 'Propietario' },
      }),
      prisma.rol.upsert({
        where: { nombre: 'Operario' },
        update: {},
        create: { nombre: 'Operario' },
      }),
    ]);
    const hash = await bcrypt.hash(password, 4);
    const [orgA, orgB] = await Promise.all([
      prisma.organizacion.create({ data: { nombre: `E2E A ${sufijo}` } }),
      prisma.organizacion.create({ data: { nombre: `E2E B ${sufijo}` } }),
    ]);
    ids.organizaciones.push(orgA.id, orgB.id);
    const crearUsuario = (
      rol_id: number,
      organizacion_id: number,
      tipo: string,
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
    const [duenoA, duenoB, operario] = await Promise.all([
      crearUsuario(rolPropietario.id, orgA.id, 'prop-a'),
      crearUsuario(rolPropietario.id, orgB.id, 'prop-b'),
      crearUsuario(rolOperario.id, orgA.id, 'operario'),
    ]);
    ids.usuarios.push(duenoA.id, duenoB.id, operario.id);
    const [granjaA, granjaB] = await Promise.all([
      prisma.granja.create({
        data: {
          nombre: 'A',
          propietario_id: duenoA.id,
          organizacion_id: orgA.id,
        },
      }),
      prisma.granja.create({
        data: {
          nombre: 'B',
          propietario_id: duenoB.id,
          organizacion_id: orgB.id,
        },
      }),
    ]);
    ids.granjas.push(granjaA.id, granjaB.id);
    const [galponA, galponB] = await Promise.all([
      prisma.galpon.create({
        data: { granja_id: granjaA.id, codigo: `GA-${sufijo}`, nombre: 'A' },
      }),
      prisma.galpon.create({
        data: { granja_id: granjaB.id, codigo: `GB-${sufijo}`, nombre: 'B' },
      }),
    ]);
    ids.galpones.push(galponA.id, galponB.id);
    await prisma.usuarioGalpon.create({
      data: { usuario_id: operario.id, galpon_id: galponA.id },
    });
    const dispositivo = await prisma.dispositivo.create({
      data: {
        galpon_id: galponA.id,
        mac_address: `MAC-${sufijo}`,
        codigo_topic: `topic-${sufijo}`,
        nombre: 'Nodo E2E',
      },
    });
    ids.dispositivo = dispositivo.id;
    const login = await request(servidor)
      .post('/v1/auth/login')
      .send({ email: operario.email, password })
      .expect(200);
    token = (JSON.parse(login.text) as { access_token: string }).access_token;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.sesion.deleteMany({
        where: { usuario_id: { in: ids.usuarios } },
      });
      await prisma.seguridadCuenta.deleteMany({
        where: { usuario_id: { in: ids.usuarios } },
      });
      await prisma.usuarioGalpon.deleteMany({
        where: { usuario_id: { in: ids.usuarios } },
      });
      await prisma.dispositivo.deleteMany({ where: { id: ids.dispositivo } });
      await prisma.galpon.deleteMany({ where: { id: { in: ids.galpones } } });
      await prisma.granja.deleteMany({ where: { id: { in: ids.granjas } } });
      await prisma.usuario.deleteMany({ where: { id: { in: ids.usuarios } } });
      await prisma.organizacion.deleteMany({
        where: { id: { in: ids.organizaciones } },
      });
    }
    await app?.close();
  });

  it('limita al Operario a su organización y galpón asignado', async () => {
    const granjas = await request(servidor)
      .get('/v1/granjas')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const galpones = await request(servidor)
      .get('/v1/galpones')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(
      (JSON.parse(granjas.text) as { data: Array<{ id: number }> }).data.map(
        (x) => x.id,
      ),
    ).toEqual([ids.granjas[0]]);
    expect(
      (JSON.parse(galpones.text) as { data: Array<{ id: number }> }).data.map(
        (x) => x.id,
      ),
    ).toEqual([ids.galpones[0]]);
  });

  it('bloquea mutaciones administrativas al Operario', async () => {
    await request(servidor)
      .post('/v1/galpones')
      .set('Authorization', `Bearer ${token}`)
      .send({ granja_id: ids.granjas[0], codigo: 'NO', nombre: 'No' })
      .expect(403);
  });

  it('rechaza relaciones cruzadas directamente en PostgreSQL', async () => {
    await expect(
      prisma.granja.create({
        data: {
          nombre: 'Cruce',
          propietario_id: ids.usuarios[0],
          organizacion_id: ids.organizaciones[1],
        },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.sensor.create({
        data: {
          galpon_id: ids.galpones[1],
          dispositivo_id: ids.dispositivo,
          codigo: `S-${sufijo}`,
          tipo: 'temperatura',
          unidad_medida: 'C',
        },
      }),
    ).rejects.toThrow();
  });
});
