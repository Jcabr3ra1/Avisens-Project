import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { IndicadoresJob } from './indicadores.job';
import { PrismaService } from '../../prisma/prisma.service';
import { IndicadoresService } from './indicadores.service';
import { JobCoordinatorService } from '../../common/jobs/job-coordinator.service';

type Tarea = () => Promise<void>;

interface LogIncoherentes {
  evento: string;
  ventana: string;
  cantidad: number;
  lotes: number[];
}

describe('IndicadoresJob', () => {
  let job: IndicadoresJob;

  const prisma = { lote: { findMany: jest.fn() } };
  const indicadores = {
    calcularParaLote: jest.fn(),
    generarAlertaDesvio: jest.fn(),
  };
  const jobs = { ejecutar: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IndicadoresJob,
        { provide: PrismaService, useValue: prisma },
        { provide: IndicadoresService, useValue: indicadores },
        { provide: JobCoordinatorService, useValue: jobs },
      ],
    }).compile();
    job = module.get(IndicadoresJob);
    indicadores.generarAlertaDesvio.mockResolvedValue({
      alerta: null,
      motivo: null,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  async function ejecutarTarea(): Promise<void> {
    await job.calcularDiar();
    const calls = jobs.ejecutar.mock.calls as Array<
      [string, string, Tarea, number]
    >;
    await calls[0][2]();
  }

  it('una fila mortalidad_incoherente no cuenta como fallo tecnico: el job no lanza', async () => {
    prisma.lote.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    indicadores.calcularParaLote
      .mockResolvedValueOnce({ estado_calculo: 'calculado' })
      .mockResolvedValueOnce({ estado_calculo: 'mortalidad_incoherente' });

    await expect(ejecutarTarea()).resolves.toBeUndefined();
    expect(indicadores.generarAlertaDesvio).toHaveBeenCalledTimes(2);
  });

  it('registra un log estructurado con los ids de los lotes incoherentes', async () => {
    prisma.lote.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]);
    indicadores.calcularParaLote
      .mockResolvedValueOnce({ estado_calculo: 'calculado' })
      .mockResolvedValueOnce({ estado_calculo: 'mortalidad_incoherente' })
      .mockResolvedValueOnce({ estado_calculo: 'mortalidad_incoherente' });
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    await ejecutarTarea();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(
      warnSpy.mock.calls[0][0] as string,
    ) as LogIncoherentes;
    expect(payload).toMatchObject({
      evento: 'indicadores.lotes_incoherentes',
      cantidad: 2,
      lotes: [2, 3],
    });
  });

  it('sin lotes incoherentes, no emite el log estructurado', async () => {
    prisma.lote.findMany.mockResolvedValue([{ id: 1 }]);
    indicadores.calcularParaLote.mockResolvedValueOnce({
      estado_calculo: 'calculado',
    });
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    await ejecutarTarea();

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('una excepcion real se cuenta como fallo tecnico: el job lanza', async () => {
    prisma.lote.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    indicadores.calcularParaLote
      .mockResolvedValueOnce({ estado_calculo: 'calculado' })
      .mockRejectedValueOnce(new Error('db caida'));

    await expect(ejecutarTarea()).rejects.toThrow(
      '1 de 2 lotes fallaron por excepcion tecnica',
    );
  });

  it('un lote incoherente y otro con excepcion real en la misma ventana no se mezclan', async () => {
    prisma.lote.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    indicadores.calcularParaLote
      .mockResolvedValueOnce({ estado_calculo: 'mortalidad_incoherente' })
      .mockRejectedValueOnce(new Error('timeout'));
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    await expect(ejecutarTarea()).rejects.toThrow(
      '1 de 2 lotes fallaron por excepcion tecnica',
    );
    const payload = JSON.parse(
      warnSpy.mock.calls[0][0] as string,
    ) as LogIncoherentes;
    expect(payload.lotes).toEqual([1]);
  });

  it('si generarAlertaDesvio lanza, tambien cuenta como fallo tecnico', async () => {
    prisma.lote.findMany.mockResolvedValue([{ id: 1 }]);
    indicadores.calcularParaLote.mockResolvedValueOnce({
      estado_calculo: 'calculado',
    });
    indicadores.generarAlertaDesvio.mockRejectedValueOnce(
      new Error('alerta caida'),
    );

    await expect(ejecutarTarea()).rejects.toThrow(
      '1 de 1 lotes fallaron por excepcion tecnica',
    );
  });
});
