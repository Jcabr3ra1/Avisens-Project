import { Test, TestingModule } from '@nestjs/testing';
import { AdminMetricasService, diaColombia } from './admin-metricas.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AdminMetricasService', () => {
  let service: AdminMetricasService;

  const prisma = {
    organizacion: { count: jest.fn() },
    usuario: { count: jest.fn() },
    granja: { count: jest.fn() },
    galpon: { count: jest.fn() },
    lote: { count: jest.fn() },
    alerta: { count: jest.fn() },
    $queryRaw: jest.fn(),
  };

  const ahora = new Date('2026-11-21T15:00:00.000Z');

  const configurarRaw = (filas: {
    aves?: number;
    medicionesHoy?: number;
    mediciones?: { fecha: string; total: number }[];
    alertas?: { fecha: string; total: number }[];
    muertes?: { fecha: string; total: number }[];
    usuarios?: { fecha: string; total: number }[];
    organizaciones?: { fecha: string; total: number }[];
  }) => {
    prisma.$queryRaw
      .mockResolvedValueOnce([{ total: filas.aves ?? 0 }])
      .mockResolvedValueOnce([{ total: filas.medicionesHoy ?? 0 }])
      .mockResolvedValueOnce(filas.mediciones ?? [])
      .mockResolvedValueOnce(filas.alertas ?? [])
      .mockResolvedValueOnce(filas.muertes ?? [])
      .mockResolvedValueOnce(filas.usuarios ?? [])
      .mockResolvedValueOnce(filas.organizaciones ?? []);
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    prisma.organizacion.count.mockResolvedValue(3);
    prisma.usuario.count.mockResolvedValue(12);
    prisma.granja.count.mockResolvedValue(4);
    prisma.galpon.count.mockResolvedValue(6);
    prisma.lote.count.mockResolvedValue(5);
    prisma.alerta.count.mockResolvedValue(2);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminMetricasService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(AdminMetricasService);
  });

  it.each([7, 30, 90])(
    'devuelve exactamente %i filas ascendentes que terminan hoy',
    async (dias) => {
      configurarRaw({});
      const r = await service.obtener(dias, ahora);
      expect(r.series).toHaveLength(dias);
      expect(r.series[dias - 1].fecha).toBe('2026-11-21');
      const fechas = r.series.map((p) => p.fecha);
      expect([...fechas].sort()).toEqual(fechas);
      expect(new Set(fechas).size).toBe(dias);
      expect(r.zona_horaria).toBe('America/Bogota');
      expect(r.dias).toBe(dias);
    },
  );

  it('rellena con ceros los días sin datos y respeta los que sí tienen', async () => {
    configurarRaw({
      mediciones: [{ fecha: '2026-11-20', total: 10 }],
      alertas: [{ fecha: '2026-11-21', total: 2 }],
    });
    const r = await service.obtener(7, ahora);
    const dia20 = r.series.find((p) => p.fecha === '2026-11-20');
    expect(dia20).toEqual({
      fecha: '2026-11-20',
      mediciones: 10,
      alertas: 0,
      aves_muertas: 0,
      usuarios_nuevos: 0,
      organizaciones_nuevas: 0,
    });
    expect(r.series[6].alertas).toBe(2);
    expect(r.series[0].mediciones).toBe(0);
  });

  it('un instante a las 23:30 hora Colombia cae en ese día y no en el siguiente', () => {
    const noche = new Date('2026-11-21T04:30:00.000Z');
    expect(diaColombia(noche)).toBe('2026-11-20');
    const nocheLocal = new Date('2026-11-21T04:59:59.000Z');
    expect(diaColombia(nocheLocal)).toBe('2026-11-20');
    expect(diaColombia(new Date('2026-11-21T05:00:00.000Z'))).toBe(
      '2026-11-21',
    );
  });

  it('usa el día de Colombia como hoy aunque en UTC ya sea el día siguiente', async () => {
    configurarRaw({});
    const r = await service.obtener(7, new Date('2026-11-22T03:00:00.000Z'));
    expect(r.series[6].fecha).toBe('2026-11-21');
  });

  it('consulta las mediciones con límites alineados a la medianoche de Colombia', async () => {
    configurarRaw({});
    await service.obtener(7, ahora);
    const llamada = prisma.$queryRaw.mock.calls[2] as unknown[];
    const [, desde, hasta] = llamada;
    expect((desde as Date).toISOString()).toBe('2026-11-08T05:00:00.000Z');
    expect((hasta as Date).toISOString()).toBe('2026-11-22T05:00:00.000Z');
  });

  it('suma el periodo anterior de los días previos a la ventana', async () => {
    configurarRaw({
      mediciones: [
        { fecha: '2026-11-14', total: 100 },
        { fecha: '2026-11-08', total: 50 },
        { fecha: '2026-11-07', total: 7 },
        { fecha: '2026-11-15', total: 3 },
      ],
      muertes: [
        { fecha: '2026-11-10', total: 4 },
        { fecha: '2026-11-18', total: 9 },
      ],
    });
    const r = await service.obtener(7, ahora);
    expect(r.periodo_anterior.mediciones).toBe(150);
    expect(r.periodo_anterior.aves_muertas).toBe(4);
    expect(r.periodo_anterior.alertas).toBe(0);
    expect(r.series.reduce((a, p) => a + p.mediciones, 0)).toBe(3);
    expect(r.series.reduce((a, p) => a + p.aves_muertas, 0)).toBe(9);
  });

  it('expone los totales actuales y las aves en producción', async () => {
    configurarRaw({ aves: 8200, medicionesHoy: 345 });
    const r = await service.obtener(30, ahora);
    expect(r.actuales).toEqual({
      organizaciones_activas: 3,
      usuarios_activos: 12,
      granjas_activas: 4,
      galpones_activos: 6,
      lotes_activos: 5,
      aves_en_produccion: 8200,
      mediciones_hoy: 345,
      alertas_abiertas: 2,
    });
    expect(prisma.lote.count).toHaveBeenCalledWith({
      where: { estado: 'activo', fecha_salida_real: null },
    });
    expect(prisma.alerta.count).toHaveBeenCalledWith({
      where: { estado: { in: ['abierta', 'en_proceso'] } },
    });
  });

  it('aves en producción es 0 cuando no hay lotes activos', async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValue([]);
    const r = await service.obtener(7, ahora);
    expect(r.actuales.aves_en_produccion).toBe(0);
    expect(r.actuales.mediciones_hoy).toBe(0);
  });
});
