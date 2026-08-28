import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { ModelosMlService } from './modelos-ml.service';

describe('ModelosMlService', () => {
  let service: ModelosMlService;
  const prisma = {
    modeloMl: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModelosMlService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<ModelosMlService>(ModelosMlService);
    prisma.$transaction.mockResolvedValue([[], 0]);
  });

  it('crea un modelo', async () => {
    prisma.modeloMl.create.mockResolvedValue({ id: 1, nombre: 'test' });
    const r = await service.crear({ nombre: 'test' });
    expect(r.id).toBe(1);
  });

  it('lanza ConflictException si nombre+version duplicados', async () => {
    const err = Object.assign(new Error('dup'), { code: 'P2002' });
    prisma.modeloMl.create.mockRejectedValue(err);
    await expect(
      service.crear({ nombre: 'test', version: '1.0' }),
    ).rejects.toThrow(ConflictException);
  });

  it('lanza NotFound al obtener inexistente', async () => {
    prisma.modeloMl.findUnique.mockResolvedValue(null);
    await expect(service.obtener(99)).rejects.toThrow(NotFoundException);
  });

  it('desactiva un modelo conservando su historial', async () => {
    prisma.modeloMl.findUnique.mockResolvedValue({ id: 1 });
    prisma.modeloMl.update.mockResolvedValue({ id: 1, activo: false });
    expect(await service.eliminar(1)).toEqual({ id: 1, activo: false });
    expect(prisma.modeloMl.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { activo: false } }),
    );
  });

  it('guarda la fecha de entrenamiento como Date', async () => {
    prisma.modeloMl.create.mockResolvedValue({ id: 1 });
    await service.crear({
      nombre: 'mortalidad',
      fecha_entrenamiento: '2026-08-27T15:30:00.000Z',
    });
    const llamadas = prisma.modeloMl.create.mock.calls as unknown as Array<
      [{ data: { fecha_entrenamiento?: Date } }]
    >;
    const data = llamadas[0][0].data;
    expect(data.fecha_entrenamiento).toEqual(
      new Date('2026-08-27T15:30:00.000Z'),
    );
  });
});
