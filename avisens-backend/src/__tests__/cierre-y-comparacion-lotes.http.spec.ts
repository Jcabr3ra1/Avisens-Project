import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { LotesController } from '../modules/lotes/lotes.controller';
import { LotesService } from '../modules/lotes/lotes.service';
import { IndicadoresController } from '../modules/indicadores/indicadores.controller';
import { IndicadoresService } from '../modules/indicadores/indicadores.service';
import { ResumenCrecimientoService } from '../modules/indicadores/resumen-crecimiento.service';
import { CompararLotesService } from '../modules/indicadores/comparar-lotes.service';

class FakeJwtGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: { id: number; rol: string };
    }>();
    const rol = req.headers['x-test-rol'] ?? 'Propietario';
    const id = Number(req.headers['x-test-user-id'] ?? '5');
    req.user = { id, rol };
    return true;
  }
}

describe('HTTP · Cierre de lote y comparación día a día', () => {
  let app: INestApplication<App>;

  const prisma = {
    lote: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    consumoDiario: { findMany: jest.fn() },
    registroMortalidad: { findMany: jest.fn() },
    pesaje: { findMany: jest.fn() },
    indicadorLote: { findMany: jest.fn() },
    categoriaFinanciera: { findFirst: jest.fn(), create: jest.fn() },
    movimientoFinanciero: { create: jest.fn() },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [LotesController, IndicadoresController],
      providers: [
        LotesService,
        CompararLotesService,
        { provide: IndicadoresService, useValue: {} },
        { provide: ResumenCrecimientoService, useValue: {} },
        { provide: PrismaService, useValue: prisma },
        RolesGuard,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(FakeJwtGuard)
      .compile();

    app = moduleRef.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(
      (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('PATCH /v1/lotes/:id/cerrar bloquea al Operario con 403', async () => {
    await request(app.getHttpServer())
      .patch('/v1/lotes/10/cerrar')
      .set('x-test-rol', 'Operario')
      .send({
        fecha_salida_real: '2026-08-03',
        cantidad_aves_vendidas: 950,
        peso_promedio_final_g: 2000,
      })
      .expect(403);
  });

  it('PATCH /v1/lotes/:id/cerrar devuelve aviso de días faltantes y luego cierra al confirmar', async () => {
    const loteActivo = {
      id: 10,
      codigo: 'LOT-2026-000010',
      estado: 'activo',
      fecha_ingreso: new Date('2026-08-01T00:00:00.000Z'),
      cantidad_inicial: 1000,
      galpon: {
        id: 3,
        nombre: 'Galpón 1',
        granja: { id: 2, nombre: 'La Palma', propietario_id: 5 },
      },
    };
    prisma.lote.findUnique.mockResolvedValue(loteActivo);
    prisma.consumoDiario.findMany.mockResolvedValue([
      { fecha: new Date('2026-08-01T00:00:00.000Z'), alimento_kg: 1500 },
    ]);
    prisma.registroMortalidad.findMany.mockResolvedValue([
      { fecha: new Date('2026-08-02T00:00:00.000Z'), cantidad_aves: 50 },
    ]);

    const aviso = await request(app.getHttpServer())
      .patch('/v1/lotes/10/cerrar')
      .set('x-test-rol', 'Propietario')
      .set('x-test-user-id', '5')
      .send({
        fecha_salida_real: '2026-08-02',
        cantidad_aves_vendidas: 950,
        peso_promedio_final_g: 2000,
        valor_venta_total_cop: 9500000,
      })
      .expect(200);

    expect(aviso.body).toMatchObject({
      cerrado: false,
      requiere_confirmacion: true,
      dias_sin_alimento: [{ dia: 2, fecha: '2026-08-02' }],
    });

    prisma.$queryRaw.mockResolvedValue([{ id: 10, estado: 'activo' }]);
    prisma.lote.update.mockResolvedValue({
      ...loteActivo,
      estado: 'finalizado',
      cantidad_aves_vendidas: 950,
      peso_promedio_final_g: 2000,
      valor_venta_total_cop: 9500000,
      mortalidad_acumulada_final_pct: 5,
      fcr_final: 0.789,
    });
    prisma.categoriaFinanciera.findFirst.mockResolvedValue({ id: 1 });
    prisma.movimientoFinanciero.create.mockResolvedValue({
      id: 99,
      tipo: 'ingreso',
      valor_cop: 9500000,
    });

    const cierre = await request(app.getHttpServer())
      .patch('/v1/lotes/10/cerrar')
      .set('x-test-rol', 'Propietario')
      .set('x-test-user-id', '5')
      .send({
        fecha_salida_real: '2026-08-02',
        cantidad_aves_vendidas: 950,
        peso_promedio_final_g: 2000,
        valor_venta_total_cop: 9500000,
        confirmar_cierre: true,
      })
      .expect(200);

    expect(cierre.body).toMatchObject({
      cerrado: true,
      requiere_confirmacion: false,
      movimiento_financiero: { id: 99, tipo: 'ingreso', valor_cop: 9500000 },
      resumen_cierre: {
        duracion_dias: 2,
        mortalidad_acumulada_final_pct: 5,
      },
    });
  });

  it('GET /v1/indicadores/comparar-lotes responde 200 con serie día por día y no choca con :loteId', async () => {
    prisma.lote.findMany.mockResolvedValue([
      {
        id: 1,
        codigo: 'LOT-2026-000001',
        estado: 'finalizado',
        fecha_ingreso: new Date('2026-06-01T00:00:00.000Z'),
        fecha_salida_real: new Date('2026-06-02T00:00:00.000Z'),
        cantidad_inicial: 1000,
        cantidad_aves_vendidas: 980,
        peso_promedio_final_g: 2000,
        mortalidad_acumulada_final_pct: 2,
        fcr_final: 1.5,
        galpon: {
          id: 3,
          nombre: 'Galpón 1',
          granja: { id: 2, nombre: 'La Palma', propietario_id: 5 },
        },
      },
      {
        id: 2,
        codigo: 'LOT-2026-000002',
        estado: 'finalizado',
        fecha_ingreso: new Date('2026-07-01T00:00:00.000Z'),
        fecha_salida_real: new Date('2026-07-02T00:00:00.000Z'),
        cantidad_inicial: 1200,
        cantidad_aves_vendidas: 1150,
        peso_promedio_final_g: 2150,
        mortalidad_acumulada_final_pct: 4.17,
        fcr_final: 1.58,
        galpon: {
          id: 4,
          nombre: 'Galpón 2',
          granja: { id: 2, nombre: 'La Palma', propietario_id: 5 },
        },
      },
    ]);
    prisma.pesaje.findMany.mockResolvedValue([]);
    prisma.registroMortalidad.findMany.mockResolvedValue([]);
    prisma.consumoDiario.findMany.mockResolvedValue([]);
    prisma.indicadorLote.findMany.mockResolvedValue([]);

    const res = await request(app.getHttpServer())
      .get('/v1/indicadores/comparar-lotes?lote1Id=1&lote2Id=2')
      .set('x-test-rol', 'Propietario')
      .set('x-test-user-id', '5')
      .expect(200);

    expect(res.body).toMatchObject({
      dias_totales: 2,
      lote_1: { id: 1, codigo: 'LOT-2026-000001' },
      lote_2: { id: 2, codigo: 'LOT-2026-000002' },
    });
    expect((res.body as { serie: unknown[] }).serie).toHaveLength(2);
  });
});
