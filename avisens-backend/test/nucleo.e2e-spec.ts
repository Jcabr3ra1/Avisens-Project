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
import { CatalogoSensoresModule } from '../src/modules/catalogo-sensores/catalogo-sensores.module';
import { PERMISOS } from '../src/common/auth/permisos';
import { IngestModule } from '../src/modules/ingest/ingest.module';
import { hashDeviceToken } from '../src/common/security/device-token';
import { randomUUID } from 'crypto';
import { ComandosVozModule } from '../src/modules/comandos-voz/comandos-voz.module';

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
    sensor: 0,
    catalogoSensor: 0,
  };
  const sufijo = `${Date.now()}-${process.pid}`;
  const password = 'Prueba-e2e-123';
  const deviceToken = `iot-${randomUUID()}`;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
        PrismaModule,
        AuthModule,
        GranjasModule,
        GalponesModule,
        CatalogoSensoresModule,
        IngestModule,
        ComandosVozModule,
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
        token_ingesta_hash: hashDeviceToken(deviceToken),
      },
    });
    ids.dispositivo = dispositivo.id;
    const sensor = await prisma.sensor.create({
      data: {
        galpon_id: galponA.id,
        dispositivo_id: dispositivo.id,
        codigo: `TEMP-${sufijo}`,
        tipo: 'temperatura',
        unidad_medida: 'C',
      },
    });
    ids.sensor = sensor.id;
    const catalogo = await prisma.catalogoSensor.create({
      data: {
        tipo_sensor: `temperatura-${sufijo}`,
        nombre: 'Temperatura E2E',
        precio_unitario_cop: 85000,
      },
    });
    ids.catalogoSensor = catalogo.id;
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
      await prisma.comandoVoz.deleteMany({
        where: { usuario_id: { in: ids.usuarios } },
      });
      await prisma.medicion.deleteMany({ where: { sensor_id: ids.sensor } });
      await prisma.ingestaDispositivo.deleteMany({
        where: { dispositivo_id: ids.dispositivo },
      });
      await prisma.sensor.deleteMany({ where: { id: ids.sensor } });
      await prisma.dispositivo.deleteMany({ where: { id: ids.dispositivo } });
      await prisma.catalogoSensor.deleteMany({
        where: { id: ids.catalogoSensor },
      });
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

  it('expone el RBAC efectivo y permite solo lectura de catálogos', async () => {
    const permisos = await request(servidor)
      .get('/v1/auth/permisos')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const cuerpo = JSON.parse(permisos.text) as { permisos: string[] };
    expect(cuerpo.permisos).toContain(PERMISOS.CATALOGOS_LEER);
    expect(cuerpo.permisos).not.toContain(PERMISOS.CATALOGOS_GESTIONAR);

    await request(servidor)
      .get('/v1/catalogo-sensores')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    await request(servidor)
      .post('/v1/catalogo-sensores')
      .set('Authorization', `Bearer ${token}`)
      .send({
        tipo_sensor: 'prohibido',
        nombre: 'Prohibido',
        precio_unitario_cop: 1,
      })
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

  it('hace idempotente la ingesta IoT ante reintentos del dispositivo', async () => {
    const idLote = randomUUID();
    const cuerpo = {
      id_lote: idLote,
      fecha_dispositivo: new Date().toISOString(),
      lecturas: [{ codigo: `TEMP-${sufijo}`, valor: 24.8 }],
    };

    const primera = await request(servidor)
      .post('/ingest')
      .set('X-Device-Token', deviceToken)
      .send(cuerpo)
      .expect(201);
    const segunda = await request(servidor)
      .post('/ingest')
      .set('X-Device-Token', deviceToken)
      .send(cuerpo)
      .expect(201);

    expect((JSON.parse(primera.text) as { duplicada: boolean }).duplicada).toBe(
      false,
    );
    expect((JSON.parse(segunda.text) as { duplicada: boolean }).duplicada).toBe(
      true,
    );
    await expect(
      prisma.medicion.count({ where: { sensor_id: ids.sensor } }),
    ).resolves.toBe(1);
  });

  it('consulta el ambiente por voz sin habilitar acciones peligrosas', async () => {
    const consulta = await request(servidor)
      .post('/v1/comandos-voz/interpretar')
      .set('Authorization', `Bearer ${token}`)
      .send({
        galpon_id: ids.galpones[0],
        comando_texto: '¿Cuál es la temperatura?',
      })
      .expect(201);
    expect(JSON.parse(consulta.text)).toMatchObject({
      tipo_comando: 'consultar_temperatura',
      accion_ejecutada: 'consulta_ambiental',
      requiere_clarificacion: false,
    });

    const accion = await request(servidor)
      .post('/v1/comandos-voz/interpretar')
      .set('Authorization', `Bearer ${token}`)
      .send({
        galpon_id: ids.galpones[0],
        comando_texto: 'Apaga los ventiladores',
      })
      .expect(201);
    expect(JSON.parse(accion.text)).toMatchObject({
      tipo_comando: 'accion_no_autorizada',
      accion_ejecutada: null,
      requiere_clarificacion: true,
      lecturas: [],
    });
  });

  it('sincroniza comandos offline de forma idempotente', async () => {
    const idSincronizacion = randomUUID();
    const cuerpo = {
      comandos: [
        {
          galpon_id: ids.galpones[0],
          comando_texto: 'temperatura',
          id_sincronizacion: idSincronizacion,
          fecha_ejecucion: new Date().toISOString(),
        },
      ],
    };

    const primera = await request(servidor)
      .post('/v1/comandos-voz/sincronizar')
      .set('Authorization', `Bearer ${token}`)
      .send(cuerpo)
      .expect(201);
    const segunda = await request(servidor)
      .post('/v1/comandos-voz/sincronizar')
      .set('Authorization', `Bearer ${token}`)
      .send(cuerpo)
      .expect(201);

    const respuestaPrimera = JSON.parse(primera.text) as {
      resultados: Array<{ duplicado: boolean; modo_conexion: string }>;
    };
    const respuestaSegunda = JSON.parse(segunda.text) as {
      resultados: Array<{ duplicado: boolean }>;
    };
    expect(respuestaPrimera.resultados[0]).toMatchObject({
      duplicado: false,
      modo_conexion: 'offline',
    });
    expect(respuestaSegunda.resultados[0]).toMatchObject({
      duplicado: true,
    });
    await expect(
      prisma.comandoVoz.count({
        where: {
          usuario_id: ids.usuarios[2],
          id_sincronizacion: idSincronizacion,
        },
      }),
    ).resolves.toBe(1);
  });
});
