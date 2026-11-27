import { Test, TestingModule } from '@nestjs/testing';
import { CalorHistoricoService } from './calor-historico.service';
import { ClienteMlService } from './cliente-ml.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('CalorHistoricoService', () => {
  let service: CalorHistoricoService;
  const prisma = { $queryRaw: jest.fn() };
  const clienteMl = { llamar: jest.fn(), leerJson: jest.fn() };

  const fila = (hora: string, tipo: string, promedio: number) => ({
    hora: new Date(hora),
    tipo,
    promedio,
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalorHistoricoService,
        { provide: PrismaService, useValue: prisma },
        { provide: ClienteMlService, useValue: clienteMl },
      ],
    }).compile();
    service = module.get(CalorHistoricoService);
  });

  it('cuenta las horas en peligro y emergencia que reporta el ML', async () => {
    prisma.$queryRaw.mockResolvedValue([
      fila('2026-10-20T14:00:00Z', 'temperatura', 34),
      fila('2026-10-20T14:00:00Z', 'humedad', 70),
      fila('2026-10-20T15:00:00Z', 'temperatura', 35),
      fila('2026-10-20T15:00:00Z', 'humedad', 72),
    ]);
    clienteMl.llamar.mockResolvedValue({ ok: true });
    clienteMl.leerJson.mockResolvedValue({
      horas_por_nivel: { confort: 0, alerta: 3, peligro: 5, emergencia: 2 },
    });

    const horas = await service.horasCalorSevero(7, 30);

    expect(horas).toBe(7);
    const [ruta, cuerpo] = clienteMl.llamar.mock.calls[0] as [
      string,
      { horas: unknown[]; dia_vida: number | null },
    ];
    expect(ruta).toBe('/riesgo-calor');
    expect(cuerpo.dia_vida).toBe(30);
    expect(cuerpo.horas).toEqual([
      { hora: '2026-10-20T14:00', temperatura: 34, humedad: 70 },
      { hora: '2026-10-20T15:00', temperatura: 35, humedad: 72 },
    ]);
  });

  it('ignora las horas sin ambas lecturas o con valores imposibles', async () => {
    prisma.$queryRaw.mockResolvedValue([
      fila('2026-10-20T14:00:00Z', 'temperatura', 34),
      fila('2026-10-20T15:00:00Z', 'temperatura', 99),
      fila('2026-10-20T15:00:00Z', 'humedad', 70),
    ]);

    const horas = await service.horasCalorSevero(7, 30);

    expect(horas).toBe(0);
    expect(clienteMl.llamar).not.toHaveBeenCalled();
  });

  it('sin sensores no llama al ML y devuelve 0', async () => {
    prisma.$queryRaw.mockResolvedValue([]);

    expect(await service.horasCalorSevero(7, 30)).toBe(0);
    expect(clienteMl.llamar).not.toHaveBeenCalled();
  });

  it('si el ML no responde o la base falla, devuelve 0 en vez de romper la predicción', async () => {
    prisma.$queryRaw.mockResolvedValue([
      fila('2026-10-20T14:00:00Z', 'temperatura', 34),
      fila('2026-10-20T14:00:00Z', 'humedad', 70),
    ]);
    clienteMl.llamar.mockResolvedValue(null);
    expect(await service.horasCalorSevero(7, 30)).toBe(0);

    prisma.$queryRaw.mockRejectedValue(new Error('base caída'));
    expect(await service.horasCalorSevero(7, 30)).toBe(0);
  });

  it('manda dia_vida null cuando el lote aún no cumple su primer día', async () => {
    prisma.$queryRaw.mockResolvedValue([
      fila('2026-10-20T14:00:00Z', 'temperatura', 30),
      fila('2026-10-20T14:00:00Z', 'humedad', 60),
    ]);
    clienteMl.llamar.mockResolvedValue({ ok: true });
    clienteMl.leerJson.mockResolvedValue({ horas_por_nivel: {} });

    await service.horasCalorSevero(7, 0);

    const cuerpo = (
      clienteMl.llamar.mock.calls[0] as [string, { dia_vida: null }]
    )[1];
    expect(cuerpo.dia_vida).toBeNull();
  });
});
