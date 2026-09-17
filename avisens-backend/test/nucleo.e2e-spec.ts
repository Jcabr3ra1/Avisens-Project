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
import { UmbralesModule } from '../src/modules/umbrales/umbrales.module';
import { MedicionesModule } from '../src/modules/mediciones/mediciones.module';
import { LotesModule } from '../src/modules/lotes/lotes.module';
import { AlertasService } from '../src/modules/alertas/alertas.service';

// main.ts declara este mismo parche antes de bootstrap(); esta suite arma su
// propia app con Test.createTestingModule() y nunca pasa por ese archivo.
// Sin esto, una respuesta HTTP con un id BigInt (Medicion.id) revienta con
// "Do not know how to serialize a BigInt" al serializar el JSON.
declare global {
  interface BigInt {
    toJSON(): string;
  }
}
BigInt.prototype.toJSON = function (this: bigint): string {
  return this.toString();
};

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
    umbrales: [] as number[],
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
        UmbralesModule,
        MedicionesModule,
        LotesModule,
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
      await prisma.umbralAmbiental.deleteMany({
        where: { id: { in: ids.umbrales } },
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

  it('el indice parcial rechaza una segunda version vigente de la misma combinacion', async () => {
    // Bypasea el servicio a proposito: esta prueba busca el indice de la
    // base, no el comportamiento de crear(). Insertar directo con Prisma
    // dos versiones distintas es la unica forma de aislar la garantia de
    // "un solo vigente" de las protecciones que ya aplica el servicio.
    const primero = await prisma.umbralAmbiental.create({
      data: {
        galpon_id: ids.galpones[0],
        variable: 'temperatura',
        semana_vida: 77,
        valor_minimo: 18,
        valor_maximo: 24,
        unidad: 'C',
        criticidad: 'alta',
        version: 1,
        vigente: true,
      },
    });
    ids.umbrales.push(primero.id);

    await expect(
      prisma.umbralAmbiental.create({
        data: {
          galpon_id: ids.galpones[0],
          variable: 'temperatura',
          semana_vida: 77,
          valor_minimo: 19,
          valor_maximo: 25,
          unidad: 'C',
          criticidad: 'alta',
          version: 2,
          vigente: true,
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('crear -> jubilar -> crear sube de version en vez de chocar, y sigue rechazando mientras hay vigente', async () => {
    const combinacion = {
      galpon_id: ids.galpones[0],
      variable: 'humedad',
      semana_vida: 88,
    };

    const primero = await request(servidor)
      .post('/v1/umbrales')
      .set('Authorization', `Bearer ${tokenPropietario}`)
      .send({
        ...combinacion,
        valor_minimo: 55,
        valor_maximo: 70,
        unidad: '%',
        criticidad: 'media',
      })
      .expect(201);
    const primerCuerpo = JSON.parse(primero.text) as {
      id: number;
      version: number;
      vigente: boolean;
    };
    ids.umbrales.push(primerCuerpo.id);
    expect(primerCuerpo).toMatchObject({ version: 1, vigente: true });

    await request(servidor)
      .delete(`/v1/umbrales/${primerCuerpo.id}`)
      .set('Authorization', `Bearer ${tokenPropietario}`)
      .expect(200);

    const segundo = await request(servidor)
      .post('/v1/umbrales')
      .set('Authorization', `Bearer ${tokenPropietario}`)
      .send({
        ...combinacion,
        valor_minimo: 50,
        valor_maximo: 75,
        unidad: '%',
        criticidad: 'alta',
      })
      .expect(201);
    const segundoCuerpo = JSON.parse(segundo.text) as {
      id: number;
      version: number;
      vigente: boolean;
    };
    ids.umbrales.push(segundoCuerpo.id);
    expect(segundoCuerpo).toMatchObject({ version: 2, vigente: true });

    const primeroTrasJubilar = await request(servidor)
      .get(`/v1/umbrales/${primerCuerpo.id}`)
      .set('Authorization', `Bearer ${tokenPropietario}`)
      .expect(200);
    expect(JSON.parse(primeroTrasJubilar.text)).toMatchObject({
      version: 1,
      vigente: false,
    });

    await request(servidor)
      .post('/v1/umbrales')
      .set('Authorization', `Bearer ${tokenPropietario}`)
      .send({
        ...combinacion,
        valor_minimo: 50,
        valor_maximo: 75,
        unidad: '%',
        criticidad: 'alta',
      })
      .expect(409);
  });

  describe('POST /mediciones — fallo de evaluarLectura no rompe el registro', () => {
    afterEach(() => jest.restoreAllMocks());

    it('la medición se guarda y la respuesta trae la advertencia genérica', async () => {
      jest
        .spyOn(AlertasService.prototype, 'evaluarLectura')
        .mockRejectedValueOnce(new Error('fallo simulado'));

      const respuesta = await request(servidor)
        .post('/v1/mediciones')
        .set('Authorization', `Bearer ${tokenPropietario}`)
        .send({ sensor_id: ids.sensor, valor: 24.5 })
        .expect(201);

      const cuerpo = JSON.parse(respuesta.text) as {
        sensor_id: number;
        valor: number;
        advertencia_evaluacion?: string;
      };
      expect(cuerpo.advertencia_evaluacion).toBe(
        'No se pudo completar el procesamiento de alertas para esta lectura',
      );
      expect(cuerpo.sensor_id).toBe(ids.sensor);
      expect(cuerpo.valor).toBe(24.5);

      await expect(
        prisma.medicion.count({
          where: { sensor_id: ids.sensor, valor: 24.5 },
        }),
      ).resolves.toBe(1);
    });

    it('sin fallo (evaluarLectura real, sin umbral configurado), la respuesta no trae advertencia', async () => {
      const respuesta = await request(servidor)
        .post('/v1/mediciones')
        .set('Authorization', `Bearer ${tokenPropietario}`)
        .send({ sensor_id: ids.sensor, valor: 25 })
        .expect(201);

      const cuerpo = JSON.parse(respuesta.text) as Record<string, unknown>;
      expect(cuerpo.advertencia_evaluacion).toBeUndefined();
    });
  });

  describe('exclusividad de alertas automáticas por sensor', () => {
    afterEach(async () => {
      const alertasDelSensor = await prisma.alerta.findMany({
        where: { sensor_id: ids.sensor },
        select: { id: true },
      });
      await prisma.notificacion.deleteMany({
        where: {
          referencia_tipo: 'alerta',
          referencia_id: { in: alertasDelSensor.map((a) => a.id) },
        },
      });
      await prisma.alerta.deleteMany({ where: { sensor_id: ids.sensor } });
      await prisma.umbralAmbiental.deleteMany({
        where: {
          galpon_id: ids.galpones[0],
          variable: 'temperatura',
          semana_vida: 0,
        },
      });
    });

    it('una alerta manual no absorbe una lectura automática fuera de rango', async () => {
      const manual = await request(servidor)
        .post('/v1/alertas')
        .set('Authorization', `Bearer ${tokenPropietario}`)
        .send({
          galpon_id: ids.galpones[0],
          sensor_id: ids.sensor,
          tipo: 'revision_manual',
          criticidad: 'baja',
          mensaje: 'Sensor en revisión física',
        })
        .expect(201);
      const manualCuerpo = JSON.parse(manual.text) as {
        id: number;
        origen: string;
      };
      expect(manualCuerpo.origen).toBe('manual');

      await prisma.umbralAmbiental.create({
        data: {
          galpon_id: ids.galpones[0],
          variable: 'temperatura',
          semana_vida: 0,
          valor_minimo: 20,
          valor_maximo: 25,
          unidad: 'C',
          criticidad: 'alta',
        },
      });

      const medicion = await request(servidor)
        .post('/v1/mediciones')
        .set('Authorization', `Bearer ${tokenPropietario}`)
        .send({ sensor_id: ids.sensor, valor: 40 })
        .expect(201);
      const medicionCuerpo = JSON.parse(medicion.text) as {
        advertencia_evaluacion?: string;
      };
      expect(medicionCuerpo.advertencia_evaluacion).toBeUndefined();

      const manualTrasLectura = await request(servidor)
        .get(`/v1/alertas/${manualCuerpo.id}`)
        .set('Authorization', `Bearer ${tokenPropietario}`)
        .expect(200);
      expect(JSON.parse(manualTrasLectura.text)).toMatchObject({
        origen: 'manual',
        valor_detectado: null,
      });

      const alertasDelSensor = await prisma.alerta.findMany({
        where: { sensor_id: ids.sensor },
      });
      const automaticas = alertasDelSensor.filter(
        (a) => a.origen === 'automatica',
      );
      expect(automaticas).toHaveLength(1);
      expect(automaticas[0].valor_detectado).toBe(40);
      expect(automaticas[0].estado).toBe('abierta');
    });

    it('una alerta manual y una automática conviven para el mismo sensor', async () => {
      const automatica = await prisma.alerta.create({
        data: {
          galpon_id: ids.galpones[0],
          sensor_id: ids.sensor,
          tipo: 'temperatura',
          origen: 'automatica',
          criticidad: 'alta',
          estado: 'abierta',
        },
      });
      const manual = await prisma.alerta.create({
        data: {
          galpon_id: ids.galpones[0],
          sensor_id: ids.sensor,
          tipo: 'revision_manual',
          origen: 'manual',
          criticidad: 'baja',
          estado: 'abierta',
        },
      });

      expect(manual.id).not.toBe(automatica.id);
    });

    it('el índice único rechaza una segunda alerta automática activa para el mismo sensor', async () => {
      await prisma.alerta.create({
        data: {
          galpon_id: ids.galpones[0],
          sensor_id: ids.sensor,
          tipo: 'temperatura',
          origen: 'automatica',
          criticidad: 'alta',
          estado: 'abierta',
        },
      });

      await expect(
        prisma.alerta.create({
          data: {
            galpon_id: ids.galpones[0],
            sensor_id: ids.sensor,
            tipo: 'temperatura',
            origen: 'automatica',
            criticidad: 'alta',
            estado: 'abierta',
          },
        }),
      ).rejects.toMatchObject({ code: 'P2002' });
    });

    it('Postgres rechaza un origen fuera de los tres valores permitidos', async () => {
      // $executeRawUnsafe, a proposito: evita que el cliente de Prisma
      // intercepte el valor antes de llegar a la base -- esto prueba que el
      // propio tipo enum de Postgres lo rechaza, no solo TypeScript.
      await expect(
        prisma.$executeRawUnsafe(
          `INSERT INTO alertas (galpon_id, tipo, origen, criticidad, estado) VALUES ($1, $2, $3, $4, $5)`,
          ids.galpones[0],
          'prueba_enum',
          'invalido',
          'alta',
          'abierta',
        ),
      ).rejects.toThrow(/invalid input value for enum/i);
    });
  });

  describe('exclusividad de lote activo por galpón', () => {
    // Crear/activar/actualizar un lote exige ADMINISTRADOR (ver
    // LotesController) -- ninguno de los tokens del fixture compartido tiene
    // ese rol, asi que este bloque arma el suyo propio, autocontenido.
    let tokenAdminLotes: string;
    let idAdminLotes: number;
    let orgAdminLotesId: number;
    const idsLotesCreados: number[] = [];

    beforeAll(async () => {
      const rolAdmin = await prisma.rol.upsert({
        where: { nombre: 'Administrador' },
        update: {},
        create: { nombre: 'Administrador' },
      });
      const org = await prisma.organizacion.create({
        data: { nombre: `E2E Lotes Admin ${sufijo}` },
      });
      orgAdminLotesId = org.id;
      const hash = await bcrypt.hash(password, 4);
      const admin = await prisma.usuario.create({
        data: {
          nombre_completo: 'admin-lotes',
          cedula: `admin-lotes-${sufijo}`,
          email: `admin-lotes-${sufijo}@e2e.local`,
          password_hash: hash,
          rol_id: rolAdmin.id,
          organizacion_id: orgAdminLotesId,
        },
      });
      idAdminLotes = admin.id;

      const login = await request(servidor)
        .post('/v1/auth/login')
        .send({ email: admin.email, password })
        .expect(200);
      tokenAdminLotes = (JSON.parse(login.text) as { access_token: string })
        .access_token;
    });

    afterAll(async () => {
      await prisma.sesion.deleteMany({ where: { usuario_id: idAdminLotes } });
      await prisma.seguridadCuenta.deleteMany({
        where: { usuario_id: idAdminLotes },
      });
      await prisma.usuario.deleteMany({ where: { id: idAdminLotes } });
      await prisma.organizacion.deleteMany({ where: { id: orgAdminLotesId } });
    });

    // Registra solo los ids que esta ejecucion crea -- nunca un patron
    // global de codigo, para no arrastrar filas de otra corrida.
    afterEach(async () => {
      if (idsLotesCreados.length > 0) {
        await prisma.lote.deleteMany({
          where: { id: { in: idsLotesCreados } },
        });
        idsLotesCreados.length = 0;
      }
    });

    const crearLoteDirecto = async (
      estado: 'activo' | 'inactivo' | 'finalizado',
      galponId = ids.galpones[0],
    ) => {
      const lote = await prisma.lote.create({
        data: {
          galpon_id: galponId,
          codigo: `E2E-LOTE-${randomUUID()}`,
          fecha_ingreso: new Date('2026-01-01'),
          cantidad_inicial: 100,
          estado,
        },
      });
      idsLotesCreados.push(lote.id);
      return lote;
    };

    describe('por HTTP', () => {
      it('POST /lotes responde 409 si el galpón ya tiene un lote activo, y no crea nada', async () => {
        const activo = await crearLoteDirecto('activo');

        await request(servidor)
          .post('/v1/lotes')
          .set('Authorization', `Bearer ${tokenAdminLotes}`)
          .send({
            galpon_id: ids.galpones[0],
            fecha_ingreso: '2026-02-01',
            cantidad_inicial: 200,
          })
          .expect(409);

        const activosEnGalpon = await prisma.lote.count({
          where: { galpon_id: ids.galpones[0], estado: 'activo' },
        });
        expect(activosEnGalpon).toBe(1);
        const sigueActivo = await prisma.lote.findUnique({
          where: { id: activo.id },
        });
        expect(sigueActivo?.estado).toBe('activo');
      });

      it('PATCH /lotes/:id/activar responde 409 si otro lote del galpón ya está activo, y no cambia ninguno de los dos', async () => {
        const activo = await crearLoteDirecto('activo');
        const candidato = await crearLoteDirecto('inactivo');

        await request(servidor)
          .patch(`/v1/lotes/${candidato.id}/activar`)
          .set('Authorization', `Bearer ${tokenAdminLotes}`)
          .expect(409);

        const [activoTrasIntento, candidatoTrasIntento] = await Promise.all([
          prisma.lote.findUnique({ where: { id: activo.id } }),
          prisma.lote.findUnique({ where: { id: candidato.id } }),
        ]);
        expect(activoTrasIntento?.estado).toBe('activo');
        expect(candidatoTrasIntento?.estado).toBe('inactivo');
      });

      it('PATCH /lotes/:id con estado activo responde 409 si otro lote del galpón ya está activo, y no cambia ninguno de los dos', async () => {
        const activo = await crearLoteDirecto('activo');
        const candidato = await crearLoteDirecto('inactivo');

        await request(servidor)
          .patch(`/v1/lotes/${candidato.id}`)
          .set('Authorization', `Bearer ${tokenAdminLotes}`)
          .send({ estado: 'activo' })
          .expect(409);

        const [activoTrasIntento, candidatoTrasIntento] = await Promise.all([
          prisma.lote.findUnique({ where: { id: activo.id } }),
          prisma.lote.findUnique({ where: { id: candidato.id } }),
        ]);
        expect(activoTrasIntento?.estado).toBe('activo');
        expect(candidatoTrasIntento?.estado).toBe('inactivo');
      });

      it('activar el propio lote ya activo no se rechaza por encontrarse a sí mismo', async () => {
        const activo = await crearLoteDirecto('activo');

        await request(servidor)
          .patch(`/v1/lotes/${activo.id}/activar`)
          .set('Authorization', `Bearer ${tokenAdminLotes}`)
          .expect(200);
      });

      it('actualizar el propio lote ya activo con estado activo no se rechaza por encontrarse a sí mismo', async () => {
        const activo = await crearLoteDirecto('activo');

        await request(servidor)
          .patch(`/v1/lotes/${activo.id}`)
          .set('Authorization', `Bearer ${tokenAdminLotes}`)
          .send({ estado: 'activo' })
          .expect(200);
      });

      it('tras desactivar el activo, sí se puede activar otro; un finalizado convive como histórico', async () => {
        const activo = await crearLoteDirecto('activo');
        const candidato = await crearLoteDirecto('inactivo');
        const finalizado = await crearLoteDirecto('finalizado');

        await request(servidor)
          .patch(`/v1/lotes/${activo.id}`)
          .set('Authorization', `Bearer ${tokenAdminLotes}`)
          .send({ estado: 'inactivo' })
          .expect(200);

        await request(servidor)
          .patch(`/v1/lotes/${candidato.id}/activar`)
          .set('Authorization', `Bearer ${tokenAdminLotes}`)
          .expect(200);

        const [candidatoAhora, finalizadoSigue] = await Promise.all([
          prisma.lote.findUnique({ where: { id: candidato.id } }),
          prisma.lote.findUnique({ where: { id: finalizado.id } }),
        ]);
        expect(candidatoAhora?.estado).toBe('activo');
        expect(finalizadoSigue?.estado).toBe('finalizado');
      });
    });

    describe('inserciones/actualizaciones directas contra la base', () => {
      it('el índice único rechaza un segundo lote activo insertado directo', async () => {
        await crearLoteDirecto('activo');

        await expect(crearLoteDirecto('activo')).rejects.toMatchObject({
          code: 'P2002',
        });
      });

      it('el índice único rechaza actualizar un lote inactivo a activo si ya existe otro activo', async () => {
        const activo = await crearLoteDirecto('activo');
        const candidato = await crearLoteDirecto('inactivo');

        await expect(
          prisma.lote.update({
            where: { id: candidato.id },
            data: { estado: 'activo' },
          }),
        ).rejects.toMatchObject({ code: 'P2002' });

        const [activoSigue, candidatoSigue] = await Promise.all([
          prisma.lote.findUnique({ where: { id: activo.id } }),
          prisma.lote.findUnique({ where: { id: candidato.id } }),
        ]);
        expect(activoSigue?.estado).toBe('activo');
        expect(candidatoSigue?.estado).toBe('inactivo');
      });

      it('dos galpones distintos pueden tener lotes activos simultáneamente', async () => {
        const a = await crearLoteDirecto('activo', ids.galpones[0]);
        const b = await crearLoteDirecto('activo', ids.galpones[1]);

        expect(a.galpon_id).not.toBe(b.galpon_id);
        expect(a.estado).toBe('activo');
        expect(b.estado).toBe('activo');
      });

      it('un lote histórico (inactivo) convive con el activo del mismo galpón', async () => {
        const activo = await crearLoteDirecto('activo');
        const historico = await crearLoteDirecto('inactivo');

        expect(activo.estado).toBe('activo');
        expect(historico.estado).toBe('inactivo');
      });
    });
  });
});
