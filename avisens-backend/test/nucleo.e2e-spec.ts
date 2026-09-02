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
import { MovimientosInventarioModule } from '../src/modules/movimientos-inventario/movimientos-inventario.module';
import { ZonasGalponModule } from '../src/modules/zonas-galpon/zonas-galpon.module';
import { AnalisisBioacusticoModule } from '../src/modules/analisis-bioacustico/analisis-bioacustico.module';
import { AnalisisVisionModule } from '../src/modules/analisis-vision/analisis-vision.module';

describe('Núcleo multi-tenant (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let servidor: Server;
  let token: string;
  let tokenPropietario: string;
  const ids = {
    organizaciones: [] as number[],
    usuarios: [] as number[],
    granjas: [] as number[],
    galpones: [] as number[],
    dispositivo: 0,
    sensor: 0,
    catalogoSensor: 0,
    insumo: 0,
    movimientosInventario: [] as number[],
    zonas: [] as number[],
    analisisBioacustico: [] as number[],
    analisisVision: [] as number[],
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
        MovimientosInventarioModule,
        ZonasGalponModule,
        AnalisisBioacusticoModule,
        AnalisisVisionModule,
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
    const insumo = await prisma.inventarioInsumo.create({
      data: {
        granja_id: granjaA.id,
        nombre: `Alimento E2E ${sufijo}`,
        unidad_medida: 'kg',
      },
    });
    ids.insumo = insumo.id;
    const [loginOperario, loginPropietario] = await Promise.all([
      request(servidor)
        .post('/v1/auth/login')
        .send({ email: operario.email, password })
        .expect(200),
      request(servidor)
        .post('/v1/auth/login')
        .send({ email: duenoA.email, password })
        .expect(200),
    ]);
    token = (JSON.parse(loginOperario.text) as { access_token: string })
      .access_token;
    tokenPropietario = (
      JSON.parse(loginPropietario.text) as { access_token: string }
    ).access_token;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.analisisBioacustico.deleteMany({
        where: { id: { in: ids.analisisBioacustico } },
      });
      await prisma.analisisVision.deleteMany({
        where: { id: { in: ids.analisisVision } },
      });
      await prisma.zonaGalpon.deleteMany({
        where: { id: { in: ids.zonas } },
      });
      await prisma.movimientoInventario.deleteMany({
        where: { id: { in: ids.movimientosInventario } },
      });
      await prisma.inventarioInsumo.deleteMany({
        where: { id: ids.insumo },
      });
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

  it('registra movimientos con el usuario autenticado y actualiza el stock', async () => {
    const respuesta = await request(servidor)
      .post('/v1/movimientos-inventario')
      .set('Authorization', `Bearer ${tokenPropietario}`)
      .send({
        insumo_id: ids.insumo,
        tipo_movimiento: 'entrada',
        cantidad: 25.5,
      })
      .expect(201);
    const movimiento = JSON.parse(respuesta.text) as {
      id: number;
      usuario_id: number;
      stock_resultante: string;
    };
    ids.movimientosInventario.push(movimiento.id);
    expect(movimiento).toMatchObject({
      usuario_id: ids.usuarios[0],
      stock_resultante: '25.5',
    });
    const insumo = await prisma.inventarioInsumo.findUniqueOrThrow({
      where: { id: ids.insumo },
    });
    expect(insumo.stock_actual.toString()).toBe('25.5');
  });

  it('cierra las zonas al propietario y aísla los análisis avanzados', async () => {
    // Una zona es parte física del galpón, así que reestructurarla quedó en
    // el administrador. El propietario no la crea ni siquiera en su propio
    // galpón: aquí ya no hay aislamiento que comprobar, hay una puerta
    // cerrada. El cruce entre organizaciones lo siguen cubriendo los
    // análisis de abajo, que el propietario sí puede escribir.
    await request(servidor)
      .post('/v1/zonas-galpon')
      .set('Authorization', `Bearer ${tokenPropietario}`)
      .send({ galpon_id: ids.galpones[0], nombre: 'Zona E2E' })
      .expect(403);

    const bioacustico = await request(servidor)
      .post('/v1/analisis-bioacustico')
      .set('Authorization', `Bearer ${tokenPropietario}`)
      .send({ galpon_id: ids.galpones[0], indicador: 'estres', valor: 0.2 })
      .expect(201);
    ids.analisisBioacustico.push(
      (JSON.parse(bioacustico.text) as { id: number }).id,
    );

    const vision = await request(servidor)
      .post('/v1/analisis-vision')
      .set('Authorization', `Bearer ${tokenPropietario}`)
      .send({
        galpon_id: ids.galpones[0],
        tipo_analisis: 'conteo_aves',
        resultado: { aves: 127 },
      })
      .expect(201);
    ids.analisisVision.push((JSON.parse(vision.text) as { id: number }).id);

    await request(servidor)
      .post('/v1/analisis-vision')
      .set('Authorization', `Bearer ${tokenPropietario}`)
      .send({ galpon_id: ids.galpones[1], tipo_analisis: 'cruce' })
      .expect(403);
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
