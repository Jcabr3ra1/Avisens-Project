import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TiposAlimentoService } from './tipos-alimento.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('TiposAlimentoService', () => {
  let service: TiposAlimentoService;

  const prisma = {
    tipoAlimento: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const dataDe = (mock: jest.Mock): Record<string, unknown> => {
    const calls = mock.mock.calls as Array<[{ data: Record<string, unknown> }]>;
    return calls[0][0].data;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TiposAlimentoService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<TiposAlimentoService>(TiposAlimentoService);

    prisma.$transaction.mockResolvedValue([[], 0]);
  });

  afterEach(() => jest.clearAllMocks());

  describe('crear', () => {
    it('crea el tipo de alimento con los datos del DTO', async () => {
      prisma.tipoAlimento.create.mockResolvedValue({ id: 1 });

      await service.crear({ nombre: 'Iniciación', etapa: 'iniciacion' });

      expect(prisma.tipoAlimento.create).toHaveBeenCalled();
      expect(dataDe(prisma.tipoAlimento.create).nombre).toBe('Iniciación');
    });
  });

  describe('obtener', () => {
    it('devuelve el tipo cuando existe', async () => {
      prisma.tipoAlimento.findUnique.mockResolvedValue({ id: 1 });

      await expect(service.obtener(1)).resolves.toEqual({ id: 1 });
    });

    it('rechaza (404) cuando no existe', async () => {
      prisma.tipoAlimento.findUnique.mockResolvedValue(null);

      await expect(service.obtener(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('actualizar', () => {
    it('actualiza cuando existe', async () => {
      prisma.tipoAlimento.findUnique.mockResolvedValue({ id: 1 });
      prisma.tipoAlimento.update.mockResolvedValue({ id: 1 });

      await service.actualizar(1, { marca: 'Purina' });

      expect(prisma.tipoAlimento.update).toHaveBeenCalled();
    });

    it('rechaza (404) si no existe', async () => {
      prisma.tipoAlimento.findUnique.mockResolvedValue(null);

      await expect(service.actualizar(99, { marca: 'X' })).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.tipoAlimento.update).not.toHaveBeenCalled();
    });
  });

  describe('desactivar / activar (borrado suave)', () => {
    it('desactivar pone activo=false', async () => {
      prisma.tipoAlimento.findUnique.mockResolvedValue({ id: 1 });
      prisma.tipoAlimento.update.mockResolvedValue({ id: 1 });

      const res = await service.desactivar(1);

      expect(dataDe(prisma.tipoAlimento.update)).toEqual({ activo: false });
      expect(res).toEqual({ id: 1, activo: false });
    });

    it('activar pone activo=true', async () => {
      prisma.tipoAlimento.findUnique.mockResolvedValue({ id: 1 });
      prisma.tipoAlimento.update.mockResolvedValue({ id: 1 });

      const res = await service.activar(1);

      expect(dataDe(prisma.tipoAlimento.update)).toEqual({ activo: true });
      expect(res).toEqual({ id: 1, activo: true });
    });
  });

  describe('eliminarPermanente', () => {
    it('borra fisicamente cuando existe', async () => {
      prisma.tipoAlimento.findUnique.mockResolvedValue({ id: 1 });
      prisma.tipoAlimento.delete.mockResolvedValue({ id: 1 });

      const res = await service.eliminarPermanente(1);

      expect(prisma.tipoAlimento.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(res).toEqual({ id: 1, eliminado: true });
    });
  });
});
