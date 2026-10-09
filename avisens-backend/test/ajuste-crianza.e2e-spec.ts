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
import { LotesModule } from '../src/modules/lotes/lotes.module';
import { LineasGeneticasModule } from '../src/modules/lineas-geneticas/lineas-geneticas.module';
import { CurvasGeneticasModule } from '../src/modules/curvas-geneticas/curvas-geneticas.module';
import { PlanLoteModule } from '../src/modules/plan-lote/plan-lote.module';
import { PlanAlimentoModule } from '../src/modules/plan-alimento/plan-alimento.module';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PrismaExceptionFilter } from '../src/common/filters/prisma-exception.filter';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { validateEnv } from '../src/config/env.validation';

const DIAS_CURVA: Array<[number, number, number]> = [
  [1, 42, 12],
  [7, 211, 164],
  [14, 535, 551],
  [21, 1035, 1218],
  [28, 1681, 2199],
  [35, 2421, 3483],
  [42, 3100, 5023],
];

const MUERTES = [{ dia: 10, muertes: 30 }];

const INICIAL = 1000;
const INGRESO = new Date('2026-09-25T00:00:00.000Z');
const HOY = '2026-10-09';
const SOLO_DATE = [
  'hrtime',
  'nextTick',
  'performance',
  'queueMicrotask',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'requestIdleCallback',
  'cancelIdleCallback',
  'setImmediate',
  'clearImmediate',
  'setInterval',
  'clearInterval',
  'setTimeout',
  'clearTimeout',
] as const;

function acumuladoPorAve(dia: number): number {
  const puntos: Array<[number, number]> = [
    [0, 0],
    ...DIAS_CURVA.map(([d, , c]): [number, number] => [d, c]),
  ];
  for (let i = 0; i < puntos.length - 1; i++) {
    const [d0, c0] = puntos[i];
    const [d1, c1] = puntos[i + 1];
    if (dia >= d0 && dia <= d1) {
      return c0 + ((c1 - c0) * (dia - d0)) / (d1 - d0);
    }
  }
  throw new Error(`día ${dia} fuera de la curva`);
}

function kgIndependiente(desde: number, hasta: number, corte: number): number {
  let total = 0;
  for (let d = desde; d <= hasta; d++) {
    const vivas =
      INICIAL -
      MUERTES.filter((m) => m.dia <= Math.min(d - 1, corte)).reduce(
        (t, m) => t + m.muertes,
        0,
      );
    total += ((acumuladoPorAve(d) - acumuladoPorAve(d - 1)) * vivas) / 1000;
  }
  return total;
}

interface AlimentoEstimado {
  disponible: boolean;
  motivo_no_disponible: string | null;
  base: {
    estimacion_version: number;
    plan_version: number;
    dia_corte: number;
    antiguedad_dias: number;
    corte_es_hoy: boolean;
    corresponde_al_plan_vigente: boolean;
  };
  total_kg: string | null;
  hasta_corte_kg: string | null;
  pendiente_tras_corte_kg: string | null;
  pendiente_desde_hoy_kg: string | null;
  requiere_recalculo: boolean;
  motivos_recalculo: string[];
}

interface Tiempo {
  plan_version: number;
  situacion: string;
  dia_actual: number;
  dia_objetivo: number | null;
  fecha_estimada: string | null;
  dias_restantes: number | null;
  dias_sobre_objetivo: number | null;
}

describe('Ajuste del tiempo de crianza y alimento estimado (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let servidor: Server;
  let tokenDueno: string;
  let tokenOperario: string;
  let emailDueno: string;
  let emailOperario: string;
  let loteId: number;
  const sufijo = `${Date.now()}-${process.pid}`;
  const marca = `e2ecrianza${Date.now()}${process.pid}`;
  const password = 'Prueba-e2e-123';
  const ids = {
    organizaciones: [] as number[],
    usuarios: [] as number[],
    granjas: [] as number[],
    galpones: [] as number[],
    tiposAlimento: [] as number[],
    lineas: [] as number[],
  };
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const base = () => `/v1/lotes/${loteId}`;

  const enFecha = (dia: string) =>
    jest.useFakeTimers({
      now: new Date(`${dia}T15:00:00.000Z`),
      doNotFake: [...SOLO_DATE],
    });

  const entrar = async (email: string) =>
    (
      JSON.parse(
        (
          await request(servidor)
            .post('/v1/auth/login')
            .send({ email, password })
            .expect(200)
        ).text,
      ) as { access_token: string }
    ).access_token;

  const irAlDia = async (dia: string) => {
    enFecha(dia);
    tokenDueno = await entrar(emailDueno);
    tokenOperario = await entrar(emailOperario);
  };

  const leerAlimento = async () =>
    JSON.parse(
      (
        await request(servidor)
          .get(`${base()}/plan/alimento`)
          .set(auth(tokenDueno))
          .expect(200)
      ).text,
    ) as {
      alimento_estimado: AlimentoEstimado;
      desactualizado: boolean;
      motivos_desactualizacion: string[];
      antiguedad_dias: number;
      plan_vigente: { tiempo: Tiempo } | null;
      desglose: {
        renglones: Array<{ etapa: string; consumo_total_kg: string }>;
      };
    };

  const calcularAlimento = async () =>
    JSON.parse(
      (
        await request(servidor)
          .post(`${base()}/plan/alimento`)
          .set(auth(tokenDueno))
          .send({})
          .expect(201)
      ).text,
    ) as { alimento_estimado: AlimentoEstimado };

  const definirObjetivo = async (peso: number) =>
    JSON.parse(
      (
        await request(servidor)
          .post(`${base()}/plan`)
          .set(auth(tokenDueno))
          .send({ peso_objetivo_g: peso })
          .expect(201)
      ).text,
    ) as { tiempo: Tiempo; version: number };

  const decimal = (valor: string | null) => Number(valor);

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
        PrismaModule,
        AuthModule,
        GranjasModule,
        GalponesModule,
        LotesModule,
        LineasGeneticasModule,
        CurvasGeneticasModule,
        PlanLoteModule,
        PlanAlimentoModule,
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
    app.useGlobalFilters(
      new HttpExceptionFilter(),
      new PrismaExceptionFilter(),
    );
    await app.init();
    servidor = app.getHttpServer() as Server;
    prisma = app.get(PrismaService);

    enFecha(HOY);
    const [rolAdmin, rolPropietario, rolOperario] = await Promise.all(
      ['Administrador', 'Propietario', 'Operario'].map((nombre) =>
        prisma.rol.upsert({
          where: { nombre },
          update: {},
          create: { nombre },
        }),
      ),
    );
    const org = await prisma.organizacion.create({
      data: { nombre: `E2E crianza ${sufijo}` },
    });
    ids.organizaciones.push(org.id);
    const hash = await bcrypt.hash(password, 4);
    const crearUsuario = (rol_id: number, tipo: string) =>
      prisma.usuario.create({
        data: {
          nombre_completo: tipo,
          cedula: `${tipo}-${sufijo}`,
          email: `${tipo}-${sufijo}@e2e.local`,
          password_hash: hash,
          rol_id,
          organizacion_id: org.id,
        },
      });
    const [admin, dueno, operario] = await Promise.all([
      crearUsuario(rolAdmin.id, 'admin'),
      crearUsuario(rolPropietario.id, 'dueno'),
      crearUsuario(rolOperario.id, 'operario'),
    ]);
    ids.usuarios.push(admin.id, dueno.id, operario.id);
    emailDueno = dueno.email;
    emailOperario = operario.email;
    const tokenAdmin = await entrar(admin.email);
    const comoAdmin = auth(tokenAdmin);

    const linea = JSON.parse(
      (
        await request(servidor)
          .post('/v1/lineas-geneticas')
          .set(comoAdmin)
          .send({
            codigo: `crianza_${sufijo.replace(/-/g, '_')}`,
            nombre: 'Crianza E2E',
          })
          .expect(201)
      ).text,
    ) as { id: number };
    ids.lineas.push(linea.id);
    const curva = JSON.parse(
      (
        await request(servidor)
          .post('/v1/curvas-geneticas')
          .set(comoAdmin)
          .send({
            linea_genetica_id: linea.id,
            sexo: 'macho',
            fuente: 'e2e',
          })
          .expect(201)
      ).text,
    ) as { id: number };
    await request(servidor)
      .put(`/v1/curvas-geneticas/${curva.id}/puntos`)
      .set(comoAdmin)
      .send({
        puntos: DIAS_CURVA.map(([dia, peso, acumulado]) => ({
          dia,
          peso_esperado_g: peso,
          consumo_acumulado_g: acumulado,
        })),
      })
      .expect(200);
    await request(servidor)
      .patch(`/v1/curvas-geneticas/${curva.id}/publicar`)
      .set(comoAdmin)
      .expect(200);
    await request(servidor)
      .patch(`/v1/curvas-geneticas/${curva.id}/activar`)
      .set(comoAdmin)
      .expect(200);

    const etapas = [
      { etapa: 'preiniciacion', dia_inicio: 1, dia_fin: 8 },
      { etapa: 'iniciacion', dia_inicio: 9, dia_fin: 21 },
      { etapa: 'engorde', dia_inicio: 22, dia_fin: 42 },
    ];
    for (const e of etapas) {
      const tipo = await prisma.tipoAlimento.create({
        data: { nombre: `${e.etapa} ${marca}`, marca, ...e },
      });
      ids.tiposAlimento.push(tipo.id);
    }

    const granja = await prisma.granja.create({
      data: {
        nombre: `Granja crianza ${sufijo}`,
        propietario_id: dueno.id,
        organizacion_id: org.id,
      },
    });
    ids.granjas.push(granja.id);
    const galpon = await prisma.galpon.create({
      data: {
        granja_id: granja.id,
        codigo: `CR-${sufijo}`,
        nombre: 'Galpón crianza',
        capacidad_aves: 2000,
      },
    });
    ids.galpones.push(galpon.id);
    await prisma.usuarioGalpon.create({
      data: { usuario_id: operario.id, galpon_id: galpon.id },
    });
    const lote = await prisma.lote.create({
      data: {
        galpon_id: galpon.id,
        codigo: `CR-LOTE-${sufijo}`,
        fecha_ingreso: INGRESO,
        cantidad_inicial: INICIAL,
        estado: 'activo',
        sexo: 'macho',
        marca_alimento: marca,
        linea_genetica_id: linea.id,
      },
    });
    loteId = lote.id;
    await prisma.registroMortalidad.createMany({
      data: MUERTES.map((m) => ({
        lote_id: lote.id,
        fecha: new Date(INGRESO.getTime() + (m.dia - 1) * 86400000),
        cantidad_aves: m.muertes,
        usuario_id: dueno.id,
      })),
    });
    await irAlDia(HOY);
  });

  afterAll(async () => {
    jest.useRealTimers();
    await prisma.estimacionAlimentoPlan.deleteMany({
      where: { plan: { lote_id: loteId } },
    });
    await prisma.planLote.deleteMany({ where: { lote_id: loteId } });
    await prisma.registroMortalidad.deleteMany({ where: { lote_id: loteId } });
    await prisma.lote.deleteMany({ where: { id: loteId } });
    await prisma.usuarioGalpon.deleteMany({
      where: { galpon_id: { in: ids.galpones } },
    });
    await prisma.galpon.deleteMany({ where: { id: { in: ids.galpones } } });
    await prisma.granja.deleteMany({ where: { id: { in: ids.granjas } } });
    await prisma.tipoAlimento.deleteMany({
      where: { id: { in: ids.tiposAlimento } },
    });
    await prisma.curvaGeneticaVersion.deleteMany({
      where: { linea_genetica_id: { in: ids.lineas } },
    });
    await prisma.lineaGenetica.deleteMany({
      where: { id: { in: ids.lineas } },
    });
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
    await app.close();
  });

  it('1. objetivo 2000 g: tiempo del plan y alimento con corte dentro de la etapa de iniciación', async () => {
    const plan = await definirObjetivo(2000);

    expect(plan.tiempo).toMatchObject({
      plan_version: 1,
      situacion: 'en_curso',
      dia_actual: 15,
      dia_objetivo: 32,
      dias_restantes: 17,
      dias_sobre_objetivo: null,
    });
    expect(plan.tiempo.fecha_estimada).toBe('2026-10-26T00:00:00.000Z');

    const guardada = await calcularAlimento();
    const leida = await leerAlimento();
    const a = leida.alimento_estimado;

    expect(guardada.alimento_estimado).toEqual(a);
    expect(a.disponible).toBe(true);
    expect(a.base).toMatchObject({
      estimacion_version: 1,
      plan_version: 1,
      dia_corte: 15,
      antiguedad_dias: 0,
      corte_es_hoy: true,
      corresponde_al_plan_vigente: true,
    });
    expect(decimal(a.total_kg)).toBeCloseTo(kgIndependiente(1, 32, 15), 2);
    expect(decimal(a.hasta_corte_kg)).toBeCloseTo(
      kgIndependiente(1, 15, 15),
      2,
    );
    expect(decimal(a.pendiente_tras_corte_kg)).toBeCloseTo(
      kgIndependiente(16, 32, 15),
      2,
    );
    expect(
      decimal(a.hasta_corte_kg) + decimal(a.pendiente_tras_corte_kg),
    ).toBeCloseTo(decimal(a.total_kg), 3);
    expect(a.pendiente_desde_hoy_kg).toBe(a.pendiente_tras_corte_kg);
    expect(a.requiere_recalculo).toBe(false);

    const [pre, inic] = leida.desglose.renglones;
    expect(pre.etapa).toBe('preiniciacion');
    expect(inic.etapa).toBe('iniciacion');
    const hasta = decimal(a.hasta_corte_kg);
    expect(hasta).toBeGreaterThan(decimal(pre.consumo_total_kg));
    expect(hasta).toBeLessThan(
      decimal(pre.consumo_total_kg) + decimal(inic.consumo_total_kg),
    );
  });

  it('2. un GET no escribe nada ni recalcula', async () => {
    const antes = await prisma.estimacionAlimentoPlan.count({
      where: { plan: { lote_id: loteId } },
    });
    const primera = (await leerAlimento()).alimento_estimado;
    const segunda = (await leerAlimento()).alimento_estimado;
    const despues = await prisma.estimacionAlimentoPlan.count({
      where: { plan: { lote_id: loteId } },
    });

    expect(despues).toBe(antes);
    expect(segunda).toEqual(primera);
  });

  it('3. cambio de objetivo a 2500 g: el alimento anterior queda atado a su plan hasta recalcular', async () => {
    const anterior = (await leerAlimento()).alimento_estimado;
    const plan = await definirObjetivo(2500);

    expect(plan.tiempo).toMatchObject({
      plan_version: 2,
      dia_objetivo: 36,
      dias_restantes: 21,
    });

    const sinRecalcular = await leerAlimento();
    const a = sinRecalcular.alimento_estimado;
    expect(sinRecalcular.desactualizado).toBe(true);
    expect(sinRecalcular.motivos_desactualizacion).toContain('plan_cambio');
    expect(sinRecalcular.plan_vigente?.tiempo).toMatchObject({
      plan_version: 2,
      dia_objetivo: 36,
    });
    expect(a.base.corresponde_al_plan_vigente).toBe(false);
    expect(a.total_kg).toBe(anterior.total_kg);
    expect(a.pendiente_desde_hoy_kg).toBeNull();
    expect(a.requiere_recalculo).toBe(true);
    expect(a.motivos_recalculo).toContain('plan_cambio');

    const nueva = (await calcularAlimento()).alimento_estimado;
    expect(nueva.base.corresponde_al_plan_vigente).toBe(true);
    expect(nueva.base.plan_version).toBe(2);
    expect(decimal(nueva.total_kg)).toBeCloseTo(kgIndependiente(1, 36, 15), 2);
    expect(nueva.pendiente_desde_hoy_kg).toBe(nueva.pendiente_tras_corte_kg);
    expect(nueva.requiere_recalculo).toBe(false);
  });

  it('4. POST /plan/recalcular conserva el objetivo y el alimento vuelve a pedir recálculo', async () => {
    const res = JSON.parse(
      (
        await request(servidor)
          .post(`${base()}/plan/recalcular`)
          .set(auth(tokenDueno))
          .send({})
          .expect(201)
      ).text,
    ) as { tiempo: Tiempo; peso_objetivo_g: string };

    expect(res.peso_objetivo_g).toBe('2500');
    expect(res.tiempo).toMatchObject({ plan_version: 3, dia_objetivo: 36 });
    const a = (await leerAlimento()).alimento_estimado;
    expect(a.motivos_recalculo).toContain('plan_cambio');
    await calcularAlimento();
  });

  it('5. estimación de hace 3 días: conserva su pendiente tras el corte y no inventa el de hoy', async () => {
    const delDia15 = (await leerAlimento()).alimento_estimado;
    await irAlDia('2026-10-12');

    const vieja = await leerAlimento();
    const a = vieja.alimento_estimado;

    expect(vieja.antiguedad_dias).toBe(3);
    expect(vieja.plan_vigente?.tiempo).toMatchObject({
      dia_actual: 18,
      dias_restantes: 18,
    });
    expect(a.base).toMatchObject({
      dia_corte: 15,
      antiguedad_dias: 3,
      corte_es_hoy: false,
    });
    expect(a.pendiente_tras_corte_kg).toBe(delDia15.pendiente_tras_corte_kg);
    expect(a.hasta_corte_kg).toBe(delDia15.hasta_corte_kg);
    expect(a.pendiente_desde_hoy_kg).toBeNull();
    expect(a.requiere_recalculo).toBe(true);
    expect(a.motivos_recalculo).toContain('corte_anterior_a_hoy');

    const nueva = (await calcularAlimento()).alimento_estimado;
    expect(nueva.base).toMatchObject({ dia_corte: 18, corte_es_hoy: true });
    expect(decimal(nueva.hasta_corte_kg)).toBeCloseTo(
      kgIndependiente(1, 18, 18),
      2,
    );
    expect(decimal(nueva.pendiente_desde_hoy_kg)).toBeCloseTo(
      kgIndependiente(19, 36, 18),
      2,
    );
    expect(decimal(nueva.hasta_corte_kg)).toBeGreaterThan(
      decimal(delDia15.hasta_corte_kg),
    );
  });

  it('6. objetivo alcanzado y superado: sin días negativos y con recálculo para representar hoy', async () => {
    await irAlDia('2026-10-30');
    const hoyEsElObjetivo = (await leerAlimento()).plan_vigente?.tiempo;
    expect(hoyEsElObjetivo).toMatchObject({
      situacion: 'objetivo_hoy',
      dia_actual: 36,
      dias_restantes: 0,
      dias_sobre_objetivo: null,
    });

    await irAlDia('2026-11-05');
    const superado = await leerAlimento();
    expect(superado.plan_vigente?.tiempo).toMatchObject({
      situacion: 'objetivo_superado',
      dia_actual: 42,
      dias_restantes: 0,
      dias_sobre_objetivo: 6,
    });
    expect(superado.alimento_estimado.pendiente_desde_hoy_kg).toBeNull();
    expect(superado.alimento_estimado.requiere_recalculo).toBe(true);

    const nueva = (await calcularAlimento()).alimento_estimado;
    expect(nueva.base.dia_corte).toBe(42);
    expect(nueva.hasta_corte_kg).toBe(nueva.total_kg);
    expect(nueva.pendiente_tras_corte_kg).toBe('0');
    expect(nueva.pendiente_desde_hoy_kg).toBe('0');
    expect(nueva.requiere_recalculo).toBe(false);

    await irAlDia('2026-11-20');
    const mucho = await leerAlimento();
    expect(mucho.alimento_estimado.pendiente_desde_hoy_kg).toBe('0');
    expect(mucho.alimento_estimado.requiere_recalculo).toBe(false);
  });

  it('7. objetivo fuera de la curva: sin día objetivo y alimento no disponible, nunca ceros', async () => {
    await irAlDia(HOY);
    const plan = await definirObjetivo(3500);

    expect(plan.tiempo).toMatchObject({
      situacion: 'sin_dia_objetivo',
      dia_objetivo: null,
      fecha_estimada: null,
      dias_restantes: null,
      dias_sobre_objetivo: null,
    });
    const a = (await calcularAlimento()).alimento_estimado;
    expect(a.disponible).toBe(false);
    expect(a.motivo_no_disponible).toBe('estado_alimento_no_calculado');
    expect(a.total_kg).toBeNull();
    expect(a.hasta_corte_kg).toBeNull();
    expect(a.pendiente_tras_corte_kg).toBeNull();
    expect(a.pendiente_desde_hoy_kg).toBeNull();
  });

  it('8. un Operario asignado puede leer los campos nuevos pero no calcular', async () => {
    await request(servidor)
      .get(`${base()}/plan`)
      .set(auth(tokenOperario))
      .expect(200);
    const lectura = await request(servidor)
      .get(`${base()}/plan/alimento`)
      .set(auth(tokenOperario))
      .expect(200);
    expect(
      (JSON.parse(lectura.text) as { alimento_estimado: unknown })
        .alimento_estimado,
    ).toBeDefined();
    await request(servidor)
      .post(`${base()}/plan/alimento`)
      .set(auth(tokenOperario))
      .send({})
      .expect(403);
  });
});
