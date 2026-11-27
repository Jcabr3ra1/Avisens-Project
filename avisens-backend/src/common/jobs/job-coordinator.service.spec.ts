import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { JobCoordinatorService } from './job-coordinator.service';

describe('JobCoordinatorService', () => {
  let service: JobCoordinatorService;

  const prisma = {
    ejecucionJob: {
      create: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };
  const config = { get: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    config.get.mockReturnValue('true');
    prisma.ejecucionJob.create.mockResolvedValue({ id: 10n });
    prisma.ejecucionJob.updateMany.mockResolvedValue({ count: 1 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobCoordinatorService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    service = module.get(JobCoordinatorService);
  });

  it('reclama la ventana y registra la finalización', async () => {
    const tarea = jest.fn().mockResolvedValue(undefined);

    await expect(
      service.ejecutar('clima', '2026-08-25T14', tarea, 60_000),
    ).resolves.toBe(true);

    expect(tarea).toHaveBeenCalledTimes(1);
    const calls = prisma.ejecucionJob.updateMany.mock.calls as Array<
      [{ data: { estado: string; error?: string } }]
    >;
    expect(calls[0][0].data.estado).toBe('completado');
  });

  it('no ejecuta dos veces una ventana ya reclamada', async () => {
    prisma.ejecucionJob.create.mockRejectedValue({ code: 'P2002' });
    prisma.ejecucionJob.updateMany.mockResolvedValue({ count: 0 });
    const tarea = jest.fn();

    await expect(
      service.ejecutar('clima', '2026-08-25T14', tarea, 60_000),
    ).resolves.toBe(false);

    expect(tarea).not.toHaveBeenCalled();
  });

  it('registra el fallo sin impedir futuras ejecuciones del scheduler', async () => {
    const tarea = jest.fn().mockRejectedValue(new Error('API externa caída'));

    await expect(
      service.ejecutar('clima', '2026-08-25T14', tarea, 60_000),
    ).resolves.toBe(true);

    const calls = prisma.ejecucionJob.updateMany.mock.calls as Array<
      [{ data: { estado: string; error?: string } }]
    >;
    expect(calls[0][0].data).toMatchObject({
      estado: 'fallido',
      error: 'API externa caída',
    });
  });

  it('respeta JOBS_ENABLED=false', async () => {
    config.get.mockReturnValue('false');
    const tarea = jest.fn();

    await expect(
      service.ejecutar('clima', '2026-08-25T14', tarea, 60_000),
    ).resolves.toBe(false);

    expect(prisma.ejecucionJob.create).not.toHaveBeenCalled();
    expect(tarea).not.toHaveBeenCalled();
  });
});
