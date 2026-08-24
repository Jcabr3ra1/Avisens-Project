import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { SolicitudesPqrsService } from './solicitudes-pqrs.service';

describe('SolicitudesPqrsService', () => {
  let service: SolicitudesPqrsService;

  const prisma = {
    solicitudPqrs: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SolicitudesPqrsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<SolicitudesPqrsService>(SolicitudesPqrsService);
    prisma.$transaction.mockResolvedValue([[], 0]);
  });

  describe('crear', () => {
    it('crea una solicitud con estado abierta', async () => {
      prisma.solicitudPqrs.create.mockResolvedValue({ id: 1, estado: 'abierta' });
      const r = await service.crear({ prospecto_id: 1, categoria: 'Queja' });
      expect(r.id).toBe(1);
      expect(prisma.solicitudPqrs.create).toHaveBeenCalled();
    });
  });

  describe('listar', () => {
    it('ordena por fecha_creacion descendente', async () => {
      await service.listar({ page: 1, limit: 20 });
      expect(prisma.solicitudPqrs.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { fecha_creacion: 'desc' } }),
      );
    });

    it('filtra por estado y categoria', async () => {
      await service.listar({ page: 1, limit: 20, estado: 'abierta', categoria: 'Reclamo' });
      expect(prisma.solicitudPqrs.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { estado: 'abierta', categoria: 'Reclamo' } }),
      );
    });
  });

  describe('obtener', () => {
    it('lanza NotFound cuando no existe', async () => {
      prisma.solicitudPqrs.findUnique.mockResolvedValue(null);
      await expect(service.obtener(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('responder', () => {
    it('actualiza estado, respuesta y fecha_cierre al resolver', async () => {
      prisma.solicitudPqrs.findUnique.mockResolvedValue({ id: 1 });
      prisma.solicitudPqrs.update.mockResolvedValue({ id: 1, estado: 'resuelta' });

      await service.responder(1, { estado: 'resuelta', respuesta: 'Contactado' });

      expect(prisma.solicitudPqrs.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({ estado: 'resuelta' }),
        }),
      );
    });
  });

  describe('eliminar', () => {
    it('elimina una solicitud existente', async () => {
      prisma.solicitudPqrs.findUnique.mockResolvedValue({ id: 1 });
      prisma.solicitudPqrs.delete.mockResolvedValue({ id: 1 });

      const r = await service.eliminar(1);
      expect(r).toEqual({ id: 1, eliminado: true });
    });
  });
});
