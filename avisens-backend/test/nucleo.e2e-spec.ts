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
import { LineasGeneticasModule } from '../src/modules/lineas-geneticas/lineas-geneticas.module';
import { CurvasGeneticasModule } from '../src/modules/curvas-geneticas/curvas-geneticas.module';
import { PlanLoteModule } from '../src/modules/plan-lote/plan-lote.module';

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
        LineasGeneticasModule,
        CurvasGeneticasModule,
        PlanLoteModule,
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

  describe('fundacion genetica (lineas + curvas geneticas)', () => {
    // Crear/publicar/activar exige CATALOGOS_GESTIONAR (solo ADMINISTRADOR);
    // ninguno de los tokens del fixture compartido tiene ese rol, asi que
    // este bloque arma el suyo propio, autocontenido -- mismo patron que el
    // admin de "exclusividad de lote activo".
    let tokenAdminGenetica: string;
    let idAdminGenetica: number;
    let orgAdminGeneticaId: number;
    const codigoBase = sufijo.replace(/-/g, '_');
    // Registra solo las lineas que esta ejecucion crea por HTTP -- nunca un
    // patron global de codigo, para no arrastrar filas de otra corrida (ver
    // correccion en "exclusividad de lote activo"). curvaGeneticaVersion se
    // limpia por linea_genetica_id antes de borrar la linea (FK Restrict).
    const idsLineasCreadas: number[] = [];

    beforeAll(async () => {
      const rolAdmin = await prisma.rol.upsert({
        where: { nombre: 'Administrador' },
        update: {},
        create: { nombre: 'Administrador' },
      });
      const org = await prisma.organizacion.create({
        data: { nombre: `E2E Genetica Admin ${sufijo}` },
      });
      orgAdminGeneticaId = org.id;
      const hash = await bcrypt.hash(password, 4);
      const admin = await prisma.usuario.create({
        data: {
          nombre_completo: 'admin-genetica',
          cedula: `admin-genetica-${sufijo}`,
          email: `admin-genetica-${sufijo}@e2e.local`,
          password_hash: hash,
          rol_id: rolAdmin.id,
          organizacion_id: orgAdminGeneticaId,
        },
      });
      idAdminGenetica = admin.id;

      const login = await request(servidor)
        .post('/v1/auth/login')
        .send({ email: admin.email, password })
        .expect(200);
      tokenAdminGenetica = (JSON.parse(login.text) as { access_token: string })
        .access_token;
    });

    afterAll(async () => {
      // curvas_geneticas_version.publicada_por_id referencia al admin de
      // prueba (Restrict): hay que borrar las curvas (y con ellas sus
      // puntos, via cascade) antes de poder borrar el usuario.
      await prisma.curvaGeneticaVersion.deleteMany({
        where: { linea_genetica_id: { in: idsLineasCreadas } },
      });
      await prisma.lineaGenetica.deleteMany({
        where: { id: { in: idsLineasCreadas } },
      });
      await prisma.sesion.deleteMany({
        where: { usuario_id: idAdminGenetica },
      });
      await prisma.seguridadCuenta.deleteMany({
        where: { usuario_id: idAdminGenetica },
      });
      await prisma.usuario.deleteMany({ where: { id: idAdminGenetica } });
      await prisma.organizacion.deleteMany({
        where: { id: orgAdminGeneticaId },
      });
    });

    describe('por HTTP', () => {
      it('ciclo completo: crear linea -> crear curva -> PUT puntos -> publicar -> activar', async () => {
        const linea = await request(servidor)
          .post('/v1/lineas-geneticas')
          .set('Authorization', `Bearer ${tokenAdminGenetica}`)
          .send({ codigo: `ciclo_${codigoBase}`, nombre: 'Ciclo E2E' })
          .expect(201);
        const lineaId = (JSON.parse(linea.text) as { id: number }).id;
        idsLineasCreadas.push(lineaId);

        const curva = await request(servidor)
          .post('/v1/curvas-geneticas')
          .set('Authorization', `Bearer ${tokenAdminGenetica}`)
          .send({ linea_genetica_id: lineaId, sexo: 'macho', fuente: 'test' })
          .expect(201);
        const curvaCuerpo = JSON.parse(curva.text) as {
          id: number;
          estado: string;
          vigente: boolean;
        };
        expect(curvaCuerpo).toMatchObject({
          estado: 'borrador',
          vigente: false,
        });

        const conPuntos = await request(servidor)
          .put(`/v1/curvas-geneticas/${curvaCuerpo.id}/puntos`)
          .set('Authorization', `Bearer ${tokenAdminGenetica}`)
          .send({
            puntos: [
              { dia: 7, peso_esperado_g: 211 },
              { dia: 14, peso_esperado_g: 535 },
            ],
          })
          .expect(200);
        expect(
          (JSON.parse(conPuntos.text) as { puntos: unknown[] }).puntos,
        ).toHaveLength(2);

        const publicada = await request(servidor)
          .patch(`/v1/curvas-geneticas/${curvaCuerpo.id}/publicar`)
          .set('Authorization', `Bearer ${tokenAdminGenetica}`)
          .expect(200);
        expect(JSON.parse(publicada.text)).toMatchObject({
          estado: 'publicada',
          vigente: false,
        });

        const activada = await request(servidor)
          .patch(`/v1/curvas-geneticas/${curvaCuerpo.id}/activar`)
          .set('Authorization', `Bearer ${tokenAdminGenetica}`)
          .expect(200);
        expect(JSON.parse(activada.text)).toMatchObject({
          estado: 'publicada',
          vigente: true,
        });
      });

      it('PUT de puntos reemplaza el conjunto entero, no lo mezcla con el anterior', async () => {
        const linea = await request(servidor)
          .post('/v1/lineas-geneticas')
          .set('Authorization', `Bearer ${tokenAdminGenetica}`)
          .send({ codigo: `reemplazo_${codigoBase}`, nombre: 'Reemplazo E2E' })
          .expect(201);
        const lineaId = (JSON.parse(linea.text) as { id: number }).id;
        idsLineasCreadas.push(lineaId);
        const curva = await request(servidor)
          .post('/v1/curvas-geneticas')
          .set('Authorization', `Bearer ${tokenAdminGenetica}`)
          .send({ linea_genetica_id: lineaId, sexo: 'hembra', fuente: 'test' })
          .expect(201);
        const curvaId = (JSON.parse(curva.text) as { id: number }).id;

        await request(servidor)
          .put(`/v1/curvas-geneticas/${curvaId}/puntos`)
          .set('Authorization', `Bearer ${tokenAdminGenetica}`)
          .send({ puntos: [{ dia: 7, peso_esperado_g: 200 }] })
          .expect(200);

        const segundo = await request(servidor)
          .put(`/v1/curvas-geneticas/${curvaId}/puntos`)
          .set('Authorization', `Bearer ${tokenAdminGenetica}`)
          .send({
            puntos: [
              { dia: 14, peso_esperado_g: 500 },
              { dia: 21, peso_esperado_g: 900 },
            ],
          })
          .expect(200);
        const cuerpo = JSON.parse(segundo.text) as {
          puntos: Array<{ dia: number }>;
        };
        expect(cuerpo.puntos.map((p) => p.dia)).toEqual([14, 21]);
      });

      it('PATCH/DELETE sobre una curva publicada responde 409', async () => {
        const linea = await request(servidor)
          .post('/v1/lineas-geneticas')
          .set('Authorization', `Bearer ${tokenAdminGenetica}`)
          .send({ codigo: `inmutable_${codigoBase}`, nombre: 'Inmutable E2E' })
          .expect(201);
        const lineaId = (JSON.parse(linea.text) as { id: number }).id;
        idsLineasCreadas.push(lineaId);
        const curva = await request(servidor)
          .post('/v1/curvas-geneticas')
          .set('Authorization', `Bearer ${tokenAdminGenetica}`)
          .send({ linea_genetica_id: lineaId, sexo: 'mixto', fuente: 'test' })
          .expect(201);
        const curvaId = (JSON.parse(curva.text) as { id: number }).id;
        await request(servidor)
          .put(`/v1/curvas-geneticas/${curvaId}/puntos`)
          .set('Authorization', `Bearer ${tokenAdminGenetica}`)
          .send({
            puntos: [
              { dia: 7, peso_esperado_g: 200 },
              { dia: 14, peso_esperado_g: 400 },
            ],
          })
          .expect(200);
        await request(servidor)
          .patch(`/v1/curvas-geneticas/${curvaId}/publicar`)
          .set('Authorization', `Bearer ${tokenAdminGenetica}`)
          .expect(200);

        await request(servidor)
          .put(`/v1/curvas-geneticas/${curvaId}/puntos`)
          .set('Authorization', `Bearer ${tokenAdminGenetica}`)
          .send({ puntos: [{ dia: 21, peso_esperado_g: 900 }] })
          .expect(409);
        await request(servidor)
          .delete(`/v1/curvas-geneticas/${curvaId}`)
          .set('Authorization', `Bearer ${tokenAdminGenetica}`)
          .expect(409);
      });

      it('activar una segunda version deja exactamente una vigente para esa linea+sexo', async () => {
        const linea = await request(servidor)
          .post('/v1/lineas-geneticas')
          .set('Authorization', `Bearer ${tokenAdminGenetica}`)
          .send({
            codigo: `dosversiones_${codigoBase}`,
            nombre: 'Dos versiones',
          })
          .expect(201);
        const lineaId = (JSON.parse(linea.text) as { id: number }).id;
        idsLineasCreadas.push(lineaId);

        const publicarYActivar = async (peso7: number) => {
          const curva = await request(servidor)
            .post('/v1/curvas-geneticas')
            .set('Authorization', `Bearer ${tokenAdminGenetica}`)
            .send({ linea_genetica_id: lineaId, sexo: 'macho', fuente: 'test' })
            .expect(201);
          const curvaId = (JSON.parse(curva.text) as { id: number }).id;
          await request(servidor)
            .put(`/v1/curvas-geneticas/${curvaId}/puntos`)
            .set('Authorization', `Bearer ${tokenAdminGenetica}`)
            .send({
              puntos: [
                { dia: 7, peso_esperado_g: peso7 },
                { dia: 14, peso_esperado_g: peso7 + 300 },
              ],
            })
            .expect(200);
          await request(servidor)
            .patch(`/v1/curvas-geneticas/${curvaId}/publicar`)
            .set('Authorization', `Bearer ${tokenAdminGenetica}`)
            .expect(200);
          await request(servidor)
            .patch(`/v1/curvas-geneticas/${curvaId}/activar`)
            .set('Authorization', `Bearer ${tokenAdminGenetica}`)
            .expect(200);
          return curvaId;
        };

        const primeraId = await publicarYActivar(200);
        const segundaId = await publicarYActivar(210);

        const vigentes = await prisma.curvaGeneticaVersion.count({
          where: { linea_genetica_id: lineaId, sexo: 'macho', vigente: true },
        });
        expect(vigentes).toBe(1);
        const primera = await prisma.curvaGeneticaVersion.findUnique({
          where: { id: primeraId },
        });
        const segunda = await prisma.curvaGeneticaVersion.findUnique({
          where: { id: segundaId },
        });
        expect(primera?.vigente).toBe(false);
        expect(segunda?.vigente).toBe(true);
      });

      it('un rol sin CATALOGOS_GESTIONAR recibe 403 al escribir y 200 al leer', async () => {
        await request(servidor)
          .post('/v1/lineas-geneticas')
          .set('Authorization', `Bearer ${token}`)
          .send({ codigo: `sinpermiso_${codigoBase}`, nombre: 'x' })
          .expect(403);

        await request(servidor)
          .get('/v1/lineas-geneticas')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        await request(servidor)
          .get('/v1/curvas-geneticas')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
      });

      it('PUT /puntos responde 400 si puntos esta ausente, es un objeto, o es null', async () => {
        const linea = await request(servidor)
          .post('/v1/lineas-geneticas')
          .set('Authorization', `Bearer ${tokenAdminGenetica}`)
          .send({ codigo: `validacion_${codigoBase}`, nombre: 'Validacion' })
          .expect(201);
        const lineaId = (JSON.parse(linea.text) as { id: number }).id;
        idsLineasCreadas.push(lineaId);
        const curva = await request(servidor)
          .post('/v1/curvas-geneticas')
          .set('Authorization', `Bearer ${tokenAdminGenetica}`)
          .send({ linea_genetica_id: lineaId, sexo: 'macho', fuente: 'test' })
          .expect(201);
        const curvaId = (JSON.parse(curva.text) as { id: number }).id;

        await request(servidor)
          .put(`/v1/curvas-geneticas/${curvaId}/puntos`)
          .set('Authorization', `Bearer ${tokenAdminGenetica}`)
          .send({})
          .expect(400);
        await request(servidor)
          .put(`/v1/curvas-geneticas/${curvaId}/puntos`)
          .set('Authorization', `Bearer ${tokenAdminGenetica}`)
          .send({ puntos: { dia: 7, peso_esperado_g: 100 } })
          .expect(400);
        await request(servidor)
          .put(`/v1/curvas-geneticas/${curvaId}/puntos`)
          .set('Authorization', `Bearer ${tokenAdminGenetica}`)
          .send({ puntos: null })
          .expect(400);

        // El arreglo vacio sigue siendo valido: borra todos los puntos.
        await request(servidor)
          .put(`/v1/curvas-geneticas/${curvaId}/puntos`)
          .set('Authorization', `Bearer ${tokenAdminGenetica}`)
          .send({ puntos: [] })
          .expect(200);
      });

      it('dos POST /curvas-geneticas concurrentes crean dos borradores con versiones consecutivas', async () => {
        const linea = await request(servidor)
          .post('/v1/lineas-geneticas')
          .set('Authorization', `Bearer ${tokenAdminGenetica}`)
          .send({
            codigo: `concurrencia_${codigoBase}`,
            nombre: 'Concurrencia',
          })
          .expect(201);
        const lineaId = (JSON.parse(linea.text) as { id: number }).id;
        idsLineasCreadas.push(lineaId);

        const crear = () =>
          request(servidor)
            .post('/v1/curvas-geneticas')
            .set('Authorization', `Bearer ${tokenAdminGenetica}`)
            .send({
              linea_genetica_id: lineaId,
              sexo: 'hembra',
              fuente: 'test',
            })
            .expect(201);

        const [a, b] = await Promise.all([crear(), crear()]);
        const versiones = [
          (JSON.parse(a.text) as { version: number }).version,
          (JSON.parse(b.text) as { version: number }).version,
        ].sort((x, y) => x - y);

        expect(versiones).toEqual([1, 2]);
      });

      it('crear curva sobre linea inactiva responde 409; reactivar permite continuar', async () => {
        const linea = await request(servidor)
          .post('/v1/lineas-geneticas')
          .set('Authorization', `Bearer ${tokenAdminGenetica}`)
          .send({ codigo: `inactiva_${codigoBase}`, nombre: 'Inactiva E2E' })
          .expect(201);
        const lineaId = (JSON.parse(linea.text) as { id: number }).id;
        idsLineasCreadas.push(lineaId);

        await request(servidor)
          .delete(`/v1/lineas-geneticas/${lineaId}`)
          .set('Authorization', `Bearer ${tokenAdminGenetica}`)
          .expect(200);

        await request(servidor)
          .post('/v1/curvas-geneticas')
          .set('Authorization', `Bearer ${tokenAdminGenetica}`)
          .send({ linea_genetica_id: lineaId, sexo: 'macho', fuente: 'test' })
          .expect(409);

        await request(servidor)
          .patch(`/v1/lineas-geneticas/${lineaId}/activar`)
          .set('Authorization', `Bearer ${tokenAdminGenetica}`)
          .expect(200);

        await request(servidor)
          .post('/v1/curvas-geneticas')
          .set('Authorization', `Bearer ${tokenAdminGenetica}`)
          .send({ linea_genetica_id: lineaId, sexo: 'macho', fuente: 'test' })
          .expect(201);
      });

      it('activar una curva cuya linea esta inactiva responde 409; las curvas existentes siguen consultables', async () => {
        const linea = await request(servidor)
          .post('/v1/lineas-geneticas')
          .set('Authorization', `Bearer ${tokenAdminGenetica}`)
          .send({ codigo: `inactiva2_${codigoBase}`, nombre: 'Inactiva 2' })
          .expect(201);
        const lineaId = (JSON.parse(linea.text) as { id: number }).id;
        idsLineasCreadas.push(lineaId);
        const curva = await request(servidor)
          .post('/v1/curvas-geneticas')
          .set('Authorization', `Bearer ${tokenAdminGenetica}`)
          .send({ linea_genetica_id: lineaId, sexo: 'macho', fuente: 'test' })
          .expect(201);
        const curvaId = (JSON.parse(curva.text) as { id: number }).id;
        await request(servidor)
          .put(`/v1/curvas-geneticas/${curvaId}/puntos`)
          .set('Authorization', `Bearer ${tokenAdminGenetica}`)
          .send({
            puntos: [
              { dia: 7, peso_esperado_g: 200 },
              { dia: 14, peso_esperado_g: 400 },
            ],
          })
          .expect(200);
        await request(servidor)
          .patch(`/v1/curvas-geneticas/${curvaId}/publicar`)
          .set('Authorization', `Bearer ${tokenAdminGenetica}`)
          .expect(200);

        await request(servidor)
          .delete(`/v1/lineas-geneticas/${lineaId}`)
          .set('Authorization', `Bearer ${tokenAdminGenetica}`)
          .expect(200);

        await request(servidor)
          .patch(`/v1/curvas-geneticas/${curvaId}/activar`)
          .set('Authorization', `Bearer ${tokenAdminGenetica}`)
          .expect(409);

        // El histórico sigue siendo consultable aunque la linea este inactiva.
        await request(servidor)
          .get(`/v1/curvas-geneticas/${curvaId}`)
          .set('Authorization', `Bearer ${tokenAdminGenetica}`)
          .expect(200);
      });
    });

    describe('inserciones/actualizaciones directas contra la base', () => {
      it('el CHECK rechaza codigo con mayusculas', async () => {
        await expect(
          prisma.lineaGenetica.create({
            data: { codigo: `Directo_${codigoBase}`, nombre: 'x' },
          }),
        ).rejects.toThrow(/violat|check/i);
      });

      it('el CHECK rechaza dia menor a 1 y peso no positivo', async () => {
        const linea = await prisma.lineaGenetica.create({
          data: { codigo: `check_dia_${codigoBase}`, nombre: 'x' },
        });
        const curva = await prisma.curvaGeneticaVersion.create({
          data: {
            linea_genetica_id: linea.id,
            sexo: 'macho',
            version: 1,
            fuente: 'test',
          },
        });

        await expect(
          prisma.puntoCurvaGenetica.create({
            data: { curva_version_id: curva.id, dia: 0, peso_esperado_g: 100 },
          }),
        ).rejects.toThrow(/violat|check/i);
        await expect(
          prisma.puntoCurvaGenetica.create({
            data: { curva_version_id: curva.id, dia: 7, peso_esperado_g: 0 },
          }),
        ).rejects.toThrow(/violat|check/i);

        await prisma.curvaGeneticaVersion.delete({ where: { id: curva.id } });
        await prisma.lineaGenetica.delete({ where: { id: linea.id } });
      });

      it('el CHECK rechaza vigente=true con estado=borrador', async () => {
        const linea = await prisma.lineaGenetica.create({
          data: { codigo: `check_vigente_${codigoBase}`, nombre: 'x' },
        });

        await expect(
          prisma.curvaGeneticaVersion.create({
            data: {
              linea_genetica_id: linea.id,
              sexo: 'macho',
              version: 1,
              fuente: 'test',
              vigente: true,
            },
          }),
        ).rejects.toThrow(/violat|check/i);

        await prisma.lineaGenetica.delete({ where: { id: linea.id } });
      });

      it('el indice unico rechaza dos curvas vigentes de la misma linea+sexo', async () => {
        const linea = await prisma.lineaGenetica.create({
          data: { codigo: `check_indice_${codigoBase}`, nombre: 'x' },
        });
        await prisma.curvaGeneticaVersion.create({
          data: {
            linea_genetica_id: linea.id,
            sexo: 'macho',
            version: 1,
            fuente: 'test',
            estado: 'publicada',
            vigente: true,
          },
        });

        await expect(
          prisma.curvaGeneticaVersion.create({
            data: {
              linea_genetica_id: linea.id,
              sexo: 'macho',
              version: 2,
              fuente: 'test',
              estado: 'publicada',
              vigente: true,
            },
          }),
        ).rejects.toMatchObject({ code: 'P2002' });

        await prisma.curvaGeneticaVersion.deleteMany({
          where: { linea_genetica_id: linea.id },
        });
        await prisma.lineaGenetica.delete({ where: { id: linea.id } });
      });
    });
  });

  describe('plan de lote (peso objetivo comercial)', () => {
    // Crear/recalcular exige ADMINISTRADOR o PROPIETARIO (RolesGuard); leer
    // lo puede el Operario tambien. Este bloque arma su propio admin (mismo
    // patron autocontenido que "exclusividad de lote activo" y "fundacion
    // genetica"), pero reusa tokenPropietario/token (Operario) del fixture
    // compartido porque el alcance por galpon/organizacion es justo lo que
    // hay que probar, y esos dos ya estan armados para galponA.
    let tokenAdminPlan: string;
    let idAdminPlan: number;
    let orgAdminPlanId: number;
    let lineaId: number;
    let segundaLineaId: number;
    const codigoBase = `${sufijo.replace(/-/g, '_')}_plan`;
    const idsLotesCreados: number[] = [];

    beforeAll(async () => {
      const rolAdmin = await prisma.rol.upsert({
        where: { nombre: 'Administrador' },
        update: {},
        create: { nombre: 'Administrador' },
      });
      const org = await prisma.organizacion.create({
        data: { nombre: `E2E Plan Admin ${sufijo}` },
      });
      orgAdminPlanId = org.id;
      const hash = await bcrypt.hash(password, 4);
      const admin = await prisma.usuario.create({
        data: {
          nombre_completo: 'admin-plan',
          cedula: `admin-plan-${sufijo}`,
          email: `admin-plan-${sufijo}@e2e.local`,
          password_hash: hash,
          rol_id: rolAdmin.id,
          organizacion_id: orgAdminPlanId,
        },
      });
      idAdminPlan = admin.id;

      const login = await request(servidor)
        .post('/v1/auth/login')
        .send({ email: admin.email, password })
        .expect(200);
      tokenAdminPlan = (JSON.parse(login.text) as { access_token: string })
        .access_token;

      // Una sola linea+curva vigente, compartida (solo lectura) por todos
      // los tests de este bloque que necesitan un 'calculado' real: dia 1 ->
      // 100g, dia 35 -> 2500g (coincidencia exacta, sin fraccion que
      // depender), dia 42 -> 3000g.
      const linea = await request(servidor)
        .post('/v1/lineas-geneticas')
        .set('Authorization', `Bearer ${tokenAdminPlan}`)
        .send({ codigo: `plan_${codigoBase}`, nombre: 'Plan E2E' })
        .expect(201);
      lineaId = (JSON.parse(linea.text) as { id: number }).id;

      const curva = await request(servidor)
        .post('/v1/curvas-geneticas')
        .set('Authorization', `Bearer ${tokenAdminPlan}`)
        .send({ linea_genetica_id: lineaId, sexo: 'macho', fuente: 'test' })
        .expect(201);
      const curvaId = (JSON.parse(curva.text) as { id: number }).id;

      await request(servidor)
        .put(`/v1/curvas-geneticas/${curvaId}/puntos`)
        .set('Authorization', `Bearer ${tokenAdminPlan}`)
        .send({
          puntos: [
            { dia: 1, peso_esperado_g: 100 },
            { dia: 35, peso_esperado_g: 2500 },
            { dia: 42, peso_esperado_g: 3000 },
          ],
        })
        .expect(200);
      await request(servidor)
        .patch(`/v1/curvas-geneticas/${curvaId}/publicar`)
        .set('Authorization', `Bearer ${tokenAdminPlan}`)
        .expect(200);
      await request(servidor)
        .patch(`/v1/curvas-geneticas/${curvaId}/activar`)
        .set('Authorization', `Bearer ${tokenAdminPlan}`)
        .expect(200);

      // Segunda linea sin curva, solo para probar "cambiar" la linea del
      // lote (a otra distinta) por API, sin necesitar una curva propia.
      const segundaLinea = await request(servidor)
        .post('/v1/lineas-geneticas')
        .set('Authorization', `Bearer ${tokenAdminPlan}`)
        .send({ codigo: `segunda_${codigoBase}`, nombre: 'Segunda Linea E2E' })
        .expect(201);
      segundaLineaId = (JSON.parse(segundaLinea.text) as { id: number }).id;
    });

    afterAll(async () => {
      // planes_lote referencia lote/curva/linea/usuario con Restrict: hay
      // que borrar los planes antes que cualquiera de esos padres.
      await prisma.planLote.deleteMany({
        where: { lote_id: { in: idsLotesCreados } },
      });
      await prisma.lote.deleteMany({ where: { id: { in: idsLotesCreados } } });
      await prisma.curvaGeneticaVersion.deleteMany({
        where: { linea_genetica_id: lineaId },
      });
      await prisma.lineaGenetica.deleteMany({
        where: { id: { in: [lineaId, segundaLineaId] } },
      });
      await prisma.sesion.deleteMany({ where: { usuario_id: idAdminPlan } });
      await prisma.seguridadCuenta.deleteMany({
        where: { usuario_id: idAdminPlan },
      });
      await prisma.usuario.deleteMany({ where: { id: idAdminPlan } });
      await prisma.organizacion.deleteMany({ where: { id: orgAdminPlanId } });
    });

    // Registra solo los lotes que esta ejecucion crea -- nunca un patron
    // global de codigo (ver correccion en "exclusividad de lote activo").
    afterEach(async () => {
      if (idsLotesCreados.length > 0) {
        await prisma.planLote.deleteMany({
          where: { lote_id: { in: idsLotesCreados } },
        });
        await prisma.lote.deleteMany({
          where: { id: { in: idsLotesCreados } },
        });
        idsLotesCreados.length = 0;
      }
    });

    const crearLoteDirecto = async (
      overrides: {
        galpon_id?: number;
        linea_genetica_id?: number | null;
        sexo?: string | null;
        fecha_ingreso?: Date;
      } = {},
    ) => {
      const lote = await prisma.lote.create({
        data: {
          galpon_id: overrides.galpon_id ?? ids.galpones[0],
          codigo: `E2E-PLAN-${randomUUID()}`,
          fecha_ingreso: overrides.fecha_ingreso ?? new Date('2026-07-30'),
          cantidad_inicial: 100,
          linea_genetica_id:
            overrides.linea_genetica_id === undefined
              ? lineaId
              : overrides.linea_genetica_id,
          sexo: overrides.sexo === undefined ? 'macho' : overrides.sexo,
        },
      });
      idsLotesCreados.push(lote.id);
      return lote;
    };

    describe('por HTTP', () => {
      it('un Operario no puede crear un plan (403), pero sí puede leerlo', async () => {
        const lote = await crearLoteDirecto();
        await request(servidor)
          .post(`/v1/lotes/${lote.id}/plan`)
          .set('Authorization', `Bearer ${token}`)
          .send({ peso_objetivo_g: 2500 })
          .expect(403);

        await request(servidor)
          .post(`/v1/lotes/${lote.id}/plan`)
          .set('Authorization', `Bearer ${tokenAdminPlan}`)
          .send({ peso_objetivo_g: 2500 })
          .expect(201);

        await request(servidor)
          .get(`/v1/lotes/${lote.id}/plan`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
      });

      it('un Propietario no puede crear el plan de un lote ajeno (403)', async () => {
        const loteAjeno = await crearLoteDirecto({
          galpon_id: ids.galpones[1],
        });

        await request(servidor)
          .post(`/v1/lotes/${loteAjeno.id}/plan`)
          .set('Authorization', `Bearer ${tokenPropietario}`)
          .send({ peso_objetivo_g: 2500 })
          .expect(403);
      });

      it('un Propietario puede crear el plan de su propio lote', async () => {
        const lote = await crearLoteDirecto();

        const res = await request(servidor)
          .post(`/v1/lotes/${lote.id}/plan`)
          .set('Authorization', `Bearer ${tokenPropietario}`)
          .send({ peso_objetivo_g: 2500 })
          .expect(201);
        expect(JSON.parse(res.text)).toMatchObject({
          estado_dia: 'calculado',
          version: 1,
          vigente: true,
        });
      });

      it('estado_dia=calculado con snapshot/curva anidados y fecha_salida_calculada derivada', async () => {
        const lote = await crearLoteDirecto();

        const res = await request(servidor)
          .post(`/v1/lotes/${lote.id}/plan`)
          .set('Authorization', `Bearer ${tokenAdminPlan}`)
          .send({ peso_objetivo_g: 2500 })
          .expect(201);
        const cuerpo = JSON.parse(res.text) as Record<string, unknown>;
        expect(cuerpo).toMatchObject({
          estado_dia: 'calculado',
          desactualizado: false,
        });

        const snapshot = cuerpo.snapshot as Record<string, unknown>;
        expect(snapshot).toMatchObject({
          linea_genetica: { id: lineaId },
          sexo_curva: 'macho',
          fecha_ingreso: '2026-07-30T00:00:00.000Z',
        });

        const curva = cuerpo.curva as Record<string, unknown>;
        expect(curva).toMatchObject({
          linea_genetica: { id: lineaId },
          sexo: 'macho',
        });
        expect(typeof curva.version_id).toBe('number');

        const resultado = cuerpo.resultado as Record<string, unknown>;
        expect(resultado.dia_objetivo).toBe(35);
        expect(resultado.fecha_salida_calculada).toBe(
          '2026-09-02T00:00:00.000Z',
        );

        expect((cuerpo.creado_por as Record<string, unknown>).id).toBe(
          idAdminPlan,
        );
      });

      it('estado_dia=sin_curva (curva=null) cuando el lote no tiene linea genetica', async () => {
        const lote = await crearLoteDirecto({ linea_genetica_id: null });

        const res = await request(servidor)
          .post(`/v1/lotes/${lote.id}/plan`)
          .set('Authorization', `Bearer ${tokenAdminPlan}`)
          .send({ peso_objetivo_g: 2500 })
          .expect(201);
        const cuerpo = JSON.parse(res.text) as Record<string, unknown>;
        expect(cuerpo).toMatchObject({ estado_dia: 'sin_curva', curva: null });
        expect(
          (cuerpo.resultado as Record<string, unknown>).dia_objetivo,
        ).toBeNull();
      });

      it('estado_dia=fuera_de_rango cuando el objetivo excede el ultimo peso de la curva', async () => {
        const lote = await crearLoteDirecto();

        const res = await request(servidor)
          .post(`/v1/lotes/${lote.id}/plan`)
          .set('Authorization', `Bearer ${tokenAdminPlan}`)
          .send({ peso_objetivo_g: 99999 })
          .expect(201);
        const cuerpo = JSON.parse(res.text) as Record<string, unknown>;
        expect(cuerpo.estado_dia).toBe('fuera_de_rango');
        expect(cuerpo.curva).not.toBeNull();
        const resultado = cuerpo.resultado as Record<string, unknown>;
        expect(resultado.dia_objetivo).toBeNull();
        expect(resultado.fecha_salida_calculada).toBeNull();
      });

      it('cambiar el objetivo crea una version nueva y jubila la anterior', async () => {
        const lote = await crearLoteDirecto();
        await request(servidor)
          .post(`/v1/lotes/${lote.id}/plan`)
          .set('Authorization', `Bearer ${tokenAdminPlan}`)
          .send({ peso_objetivo_g: 2500 })
          .expect(201);

        const segunda = await request(servidor)
          .post(`/v1/lotes/${lote.id}/plan`)
          .set('Authorization', `Bearer ${tokenAdminPlan}`)
          .send({ peso_objetivo_g: 3000, motivo: 'ajuste comercial' })
          .expect(201);
        const cuerpoSegunda = JSON.parse(segunda.text) as Record<
          string,
          unknown
        >;
        expect(cuerpoSegunda).toMatchObject({ version: 2, vigente: true });
        expect(
          (cuerpoSegunda.resultado as Record<string, unknown>).dia_objetivo,
        ).toBe(42);

        const vigente = await request(servidor)
          .get(`/v1/lotes/${lote.id}/plan`)
          .set('Authorization', `Bearer ${tokenAdminPlan}`)
          .expect(200);
        expect(JSON.parse(vigente.text)).toMatchObject({ version: 2 });

        const historial = await request(servidor)
          .get(`/v1/lotes/${lote.id}/plan/historial`)
          .set('Authorization', `Bearer ${tokenAdminPlan}`)
          .expect(200);
        const cuerpoHistorial = JSON.parse(historial.text) as {
          data: Array<Record<string, unknown>>;
          meta: { total: number };
        };
        expect(cuerpoHistorial.meta.total).toBe(2);
        expect(cuerpoHistorial.data).toEqual([
          expect.objectContaining({ version: 2, vigente: true }),
          expect.objectContaining({ version: 1, vigente: false }),
        ]);
        // El historial no expone desactualizado: una version jubilada no se
        // compara contra el lote actual (ver PlanLoteService.esDesactualizado).
        expect(cuerpoHistorial.data[0]).not.toHaveProperty('desactualizado');
        expect(cuerpoHistorial.data[0].snapshot).toBeDefined();
      });

      it('GET /plan responde 404 si el lote no tiene un plan vigente', async () => {
        const lote = await crearLoteDirecto();

        await request(servidor)
          .get(`/v1/lotes/${lote.id}/plan`)
          .set('Authorization', `Bearer ${tokenAdminPlan}`)
          .expect(404);
      });

      it('POST /plan/recalcular responde 404 si no hay plan vigente', async () => {
        const lote = await crearLoteDirecto();

        await request(servidor)
          .post(`/v1/lotes/${lote.id}/plan/recalcular`)
          .set('Authorization', `Bearer ${tokenAdminPlan}`)
          .send({})
          .expect(404);
      });

      it('un Operario no puede recalcular (403)', async () => {
        const lote = await crearLoteDirecto();
        await request(servidor)
          .post(`/v1/lotes/${lote.id}/plan`)
          .set('Authorization', `Bearer ${tokenAdminPlan}`)
          .send({ peso_objetivo_g: 2500 })
          .expect(201);

        await request(servidor)
          .post(`/v1/lotes/${lote.id}/plan/recalcular`)
          .set('Authorization', `Bearer ${token}`)
          .send({})
          .expect(403);
      });

      it('recalcular reusa el peso objetivo y refleja una linea genetica asignada por API', async () => {
        const lote = await crearLoteDirecto({ linea_genetica_id: null });
        const creado = await request(servidor)
          .post(`/v1/lotes/${lote.id}/plan`)
          .set('Authorization', `Bearer ${tokenAdminPlan}`)
          .send({ peso_objetivo_g: 2500 })
          .expect(201);
        expect(JSON.parse(creado.text)).toMatchObject({
          estado_dia: 'sin_curva',
        });

        await request(servidor)
          .patch(`/v1/lotes/${lote.id}`)
          .set('Authorization', `Bearer ${tokenAdminPlan}`)
          .send({ linea_genetica_id: lineaId })
          .expect(200);

        const recalculado = await request(servidor)
          .post(`/v1/lotes/${lote.id}/plan/recalcular`)
          .set('Authorization', `Bearer ${tokenAdminPlan}`)
          .send({ motivo: 'linea genetica asignada' })
          .expect(201);
        const cuerpo = JSON.parse(recalculado.text) as Record<string, unknown>;
        expect(cuerpo).toMatchObject({
          version: 2,
          estado_dia: 'calculado',
          desactualizado: false,
        });
        expect((cuerpo.resultado as Record<string, unknown>).dia_objetivo).toBe(
          35,
        );
        // Sin DecimalInterceptor (solo registrado via APP_INTERCEPTOR en
        // AppModule, que este harness de e2e no monta), un Decimal viaja
        // como string en el JSON de la respuesta.
        expect(cuerpo.peso_objetivo_g).toBe('2500');
      });

      it('asignar la linea genetica al lote por API -> crear plan -> estado calculado', async () => {
        const lote = await crearLoteDirecto({ linea_genetica_id: null });

        const patch = await request(servidor)
          .patch(`/v1/lotes/${lote.id}`)
          .set('Authorization', `Bearer ${tokenAdminPlan}`)
          .send({ linea_genetica_id: lineaId })
          .expect(200);
        expect(
          (JSON.parse(patch.text) as Record<string, unknown>).linea_genetica,
        ).toMatchObject({ id: lineaId });

        const plan = await request(servidor)
          .post(`/v1/lotes/${lote.id}/plan`)
          .set('Authorization', `Bearer ${tokenAdminPlan}`)
          .send({ peso_objetivo_g: 2500 })
          .expect(201);
        expect(JSON.parse(plan.text)).toMatchObject({
          estado_dia: 'calculado',
        });
      });

      it('una linea genetica inactiva no puede asignarse a un lote por API (400)', async () => {
        const lineaInactiva = await request(servidor)
          .post('/v1/lineas-geneticas')
          .set('Authorization', `Bearer ${tokenAdminPlan}`)
          .send({ codigo: `inactiva_${codigoBase}`, nombre: 'Inactiva E2E' })
          .expect(201);
        const lineaInactivaId = (
          JSON.parse(lineaInactiva.text) as { id: number }
        ).id;
        await request(servidor)
          .delete(`/v1/lineas-geneticas/${lineaInactivaId}`)
          .set('Authorization', `Bearer ${tokenAdminPlan}`)
          .expect(200);

        const lote = await crearLoteDirecto({ linea_genetica_id: null });
        await request(servidor)
          .patch(`/v1/lotes/${lote.id}`)
          .set('Authorization', `Bearer ${tokenAdminPlan}`)
          .send({ linea_genetica_id: lineaInactivaId })
          .expect(400);

        await prisma.lineaGenetica.delete({ where: { id: lineaInactivaId } });
      });

      it('desvincular la linea genetica por API marca el plan vigente como desactualizado', async () => {
        const lote = await crearLoteDirecto();
        await request(servidor)
          .post(`/v1/lotes/${lote.id}/plan`)
          .set('Authorization', `Bearer ${tokenAdminPlan}`)
          .send({ peso_objetivo_g: 2500 })
          .expect(201);

        await request(servidor)
          .patch(`/v1/lotes/${lote.id}`)
          .set('Authorization', `Bearer ${tokenAdminPlan}`)
          .send({ linea_genetica_id: null })
          .expect(200);

        const res = await request(servidor)
          .get(`/v1/lotes/${lote.id}/plan`)
          .set('Authorization', `Bearer ${tokenAdminPlan}`)
          .expect(200);
        const cuerpo = JSON.parse(res.text) as Record<string, unknown>;
        // El registro persistido no se recalcula solo con leerlo -- sigue
        // mostrando el dia que se calculo en su momento.
        expect((cuerpo.resultado as Record<string, unknown>).dia_objetivo).toBe(
          35,
        );
        expect(cuerpo.desactualizado).toBe(true);
      });

      it('cambiar la linea genetica del lote por API a otra distinta marca el plan vigente como desactualizado', async () => {
        const lote = await crearLoteDirecto();
        await request(servidor)
          .post(`/v1/lotes/${lote.id}/plan`)
          .set('Authorization', `Bearer ${tokenAdminPlan}`)
          .send({ peso_objetivo_g: 2500 })
          .expect(201);

        await request(servidor)
          .patch(`/v1/lotes/${lote.id}`)
          .set('Authorization', `Bearer ${tokenAdminPlan}`)
          .send({ linea_genetica_id: segundaLineaId })
          .expect(200);

        const res = await request(servidor)
          .get(`/v1/lotes/${lote.id}/plan`)
          .set('Authorization', `Bearer ${tokenAdminPlan}`)
          .expect(200);
        expect(
          (JSON.parse(res.text) as Record<string, unknown>).desactualizado,
        ).toBe(true);
      });
    });

    describe('inserciones/actualizaciones directas contra la base', () => {
      it('el CHECK de matriz rechaza calculado sin dia_objetivo', async () => {
        const lote = await crearLoteDirecto();

        await expect(
          prisma.planLote.create({
            data: {
              lote_id: lote.id,
              version: 1,
              peso_objetivo_g: 2500,
              estado_dia: 'calculado',
              curva_version_id: null,
              sexo_curva_snapshot: 'macho',
              fecha_ingreso_snapshot: lote.fecha_ingreso,
              creado_por_id: idAdminPlan,
            },
          }),
        ).rejects.toThrow(/violat|check/i);
      });

      it('el CHECK de matriz rechaza sin_curva con curva_version_id no nulo', async () => {
        const lote = await crearLoteDirecto();
        const curva = await prisma.curvaGeneticaVersion.findFirstOrThrow({
          where: { linea_genetica_id: lineaId, vigente: true },
        });

        await expect(
          prisma.planLote.create({
            data: {
              lote_id: lote.id,
              version: 1,
              peso_objetivo_g: 2500,
              estado_dia: 'sin_curva',
              curva_version_id: curva.id,
              sexo_curva_snapshot: 'macho',
              fecha_ingreso_snapshot: lote.fecha_ingreso,
              creado_por_id: idAdminPlan,
            },
          }),
        ).rejects.toThrow(/violat|check/i);
      });

      it('el CHECK escalar rechaza version menor a 1 y peso_objetivo_g no positivo', async () => {
        const lote = await crearLoteDirecto({ linea_genetica_id: null });

        await expect(
          prisma.planLote.create({
            data: {
              lote_id: lote.id,
              version: 0,
              peso_objetivo_g: 2500,
              estado_dia: 'sin_curva',
              sexo_curva_snapshot: 'macho',
              fecha_ingreso_snapshot: lote.fecha_ingreso,
              creado_por_id: idAdminPlan,
            },
          }),
        ).rejects.toThrow(/violat|check/i);

        await expect(
          prisma.planLote.create({
            data: {
              lote_id: lote.id,
              version: 1,
              peso_objetivo_g: 0,
              estado_dia: 'sin_curva',
              sexo_curva_snapshot: 'macho',
              fecha_ingreso_snapshot: lote.fecha_ingreso,
              creado_por_id: idAdminPlan,
            },
          }),
        ).rejects.toThrow(/violat|check/i);
      });

      it('el CHECK escalar rechaza dia_objetivo menor a 1', async () => {
        const lote = await crearLoteDirecto();
        const curva = await prisma.curvaGeneticaVersion.findFirstOrThrow({
          where: { linea_genetica_id: lineaId, vigente: true },
        });

        await expect(
          prisma.planLote.create({
            data: {
              lote_id: lote.id,
              version: 1,
              peso_objetivo_g: 2500,
              estado_dia: 'calculado',
              curva_version_id: curva.id,
              // valido a proposito: aisla la violacion en dia_objetivo, no
              // en linea_genetica_id_snapshot ni en dia_objetivo_interpolado.
              linea_genetica_id_snapshot: lineaId,
              sexo_curva_snapshot: 'macho',
              fecha_ingreso_snapshot: lote.fecha_ingreso,
              dia_objetivo: 0,
              dia_objetivo_interpolado: 1,
              fecha_salida_calculada: lote.fecha_ingreso,
              creado_por_id: idAdminPlan,
            },
          }),
        ).rejects.toThrow(/violat|check/i);
      });

      it('el CHECK escalar rechaza dia_objetivo_interpolado no positivo', async () => {
        const lote = await crearLoteDirecto();
        const curva = await prisma.curvaGeneticaVersion.findFirstOrThrow({
          where: { linea_genetica_id: lineaId, vigente: true },
        });

        await expect(
          prisma.planLote.create({
            data: {
              lote_id: lote.id,
              version: 1,
              peso_objetivo_g: 2500,
              estado_dia: 'calculado',
              curva_version_id: curva.id,
              linea_genetica_id_snapshot: lineaId,
              sexo_curva_snapshot: 'macho',
              fecha_ingreso_snapshot: lote.fecha_ingreso,
              dia_objetivo: 5,
              dia_objetivo_interpolado: 0,
              fecha_salida_calculada: lote.fecha_ingreso,
              creado_por_id: idAdminPlan,
            },
          }),
        ).rejects.toThrow(/violat|check/i);
      });

      it('el CHECK de matriz rechaza calculado con linea_genetica_id_snapshot nulo', async () => {
        const lote = await crearLoteDirecto();
        const curva = await prisma.curvaGeneticaVersion.findFirstOrThrow({
          where: { linea_genetica_id: lineaId, vigente: true },
        });

        await expect(
          prisma.planLote.create({
            data: {
              lote_id: lote.id,
              version: 1,
              peso_objetivo_g: 2500,
              estado_dia: 'calculado',
              curva_version_id: curva.id,
              linea_genetica_id_snapshot: null,
              sexo_curva_snapshot: 'macho',
              fecha_ingreso_snapshot: lote.fecha_ingreso,
              dia_objetivo: 35,
              dia_objetivo_interpolado: 35,
              fecha_salida_calculada: lote.fecha_ingreso,
              creado_por_id: idAdminPlan,
            },
          }),
        ).rejects.toThrow(/violat|check/i);
      });

      it('el indice unico parcial rechaza dos planes vigentes para el mismo lote', async () => {
        const lote = await crearLoteDirecto({ linea_genetica_id: null });
        await prisma.planLote.create({
          data: {
            lote_id: lote.id,
            version: 1,
            peso_objetivo_g: 2500,
            estado_dia: 'sin_curva',
            sexo_curva_snapshot: 'macho',
            fecha_ingreso_snapshot: lote.fecha_ingreso,
            creado_por_id: idAdminPlan,
            vigente: true,
          },
        });

        await expect(
          prisma.planLote.create({
            data: {
              lote_id: lote.id,
              version: 2,
              peso_objetivo_g: 2500,
              estado_dia: 'sin_curva',
              sexo_curva_snapshot: 'macho',
              fecha_ingreso_snapshot: lote.fecha_ingreso,
              creado_por_id: idAdminPlan,
              vigente: true,
            },
          }),
        ).rejects.toMatchObject({ code: 'P2002' });
      });
    });
  });
});
