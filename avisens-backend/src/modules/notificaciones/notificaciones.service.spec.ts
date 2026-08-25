import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificacionesService } from './notificaciones.service';

describe('NotificacionesService', () => {
  let service: NotificacionesService;

  const prisma = {
    notificacion: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificacionesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<NotificacionesService>(NotificacionesService);
    prisma.$transaction.mockResolvedValue([[], 0]);
  });

  describe('crear', () => {
    it('crea una notificacion', async () => {
      prisma.notificacion.create.mockResolvedValue({ id: 1, leida: false });
      const r = await service.crear({
        usuario_id: 1, tipo: 'sistema', titulo: 'Test', mensaje: 'Hola',
      });
      expect(r.id).toBe(1);
    });
  });

  describe('contarNoLeidas', () => {
    it('devuelve el conteo de no leidas', async () => {
      prisma.notificacion.count.mockResolvedValue(5);
      const r = await service.contarNoLeidas(1);
      expect(r.no_leidas).toBe(5);
    });
  });

  describe('marcarLeida', () => {
    it('lanza NotFound si no pertenece al usuario', async () => {
      prisma.notificacion.findFirst.mockResolvedValue(null);
      await expect(service.marcarLeida(99, 1)).rejects.toThrow(NotFoundException);
    });

    it('marca como leida', async () => {
      prisma.notificacion.findFirst.mockResolvedValue({ id: 1 });
      prisma.notificacion.update.mockResolvedValue({ id: 1, leida: true });
      const r = await service.marcarLeida(1, 1);
      expect(r.leida).toBe(true);
    });
  });

  describe('marcarTodasLeidas', () => {
    it('actualiza todas las no leidas del usuario', async () => {
      prisma.notificacion.updateMany.mockResolvedValue({ count: 3 });
      const r = await service.marcarTodasLeidas(1);
      expect(r.mensaje).toContain('leídas');
    });
  });

  describe('eliminar', () => {
    it('elimina una notificacion existente', async () => {
      prisma.notificacion.findFirst.mockResolvedValue({ id: 1 });
      prisma.notificacion.delete.mockResolvedValue({ id: 1 });
      const r = await service.eliminar(1, 1);
      expect(r).toEqual({ id: 1, eliminado: true });
    });
  });
});
