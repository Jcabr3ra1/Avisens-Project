import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RegistrosPlagasService } from './registros-plagas.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('RegistrosPlagasService', () => {
  let service: RegistrosPlagasService;

  const prisma = {
    registroPlaga: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    lote: { findUnique: jest.fn() },
    inventarioInsumo: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  };

  const admin = { id: 1, rol: 'Administrador' };
  const propietario = { id: 5, rol: 'Propietario' };

  const dtoCrear = {
    lote_id: 3,
    fecha: '2026-08-09',
    tipo_plaga: 'roedores',
  };

  const dataDe = (mock: jest.Mock): Record<string, unknown> => {
    const calls = mock.mock.calls as Array<[{ data: Record<string, unknown> }]>;
    return calls[0][0].data;
  };
  const whereDe = (mock: jest.Mock): Record<string, unknown> => {
    const calls = mock.mock.calls as Array<
      [{ where: Record<string, unknown> }]
    >;
    return calls[0][0].where;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrosPlagasService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<RegistrosPlagasService>(RegistrosPlagasService);

    prisma.$transaction.mockResolvedValue([[], 0]);
    prisma.lote.findUnique.mockResolvedValue({
      id: 3,
      galpon: { granja: { id: 7, propietario_id: 5 } },
    });
    prisma.inventarioInsumo.findFirst.mockResolvedValue({ id: 3 });
  });

  afterEach(() => jest.clearAllMocks());

  describe('crear', () => {
    it('crea el registro y toma el usuario_id del token, no del DTO', async () => {
      prisma.registroPlaga.create.mockResolvedValue({ id: 1 });

      await service.crear(dtoCrear, propietario);

      expect(prisma.registroPlaga.create).toHaveBeenCalled();
      const data = dataDe(prisma.registroPlaga.create);
      expect(data.usuario_id).toBe(propietario.id);
      expect(data.fecha).toBeInstanceOf(Date);
    });

    it('valida el insumo cuando viene insumo_id (404 si no existe)', async () => {
      prisma.inventarioInsumo.findFirst.mockResolvedValue(null);

      await expect(
        service.crear({ ...dtoCrear, insumo_id: 99 }, propietario),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.registroPlaga.create).not.toHaveBeenCalled();
    });

    it('no consulta el insumo cuando insumo_id viene vacio', async () => {
      prisma.registroPlaga.create.mockResolvedValue({ id: 1 });

      await service.crear(dtoCrear, propietario);

      expect(prisma.inventarioInsumo.findFirst).not.toHaveBeenCalled();
    });

    it('un Propietario no puede registrar en un lote ajeno (403)', async () => {
      prisma.lote.findUnique.mockResolvedValue({
        id: 3,
        galpon: { granja: { id: 7, propietario_id: 999 } },
      });

      await expect(service.crear(dtoCrear, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.registroPlaga.create).not.toHaveBeenCalled();
    });

    it('rechaza (404) si el lote no existe', async () => {
      prisma.lote.findUnique.mockResolvedValue(null);

      await expect(service.crear(dtoCrear, admin)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.registroPlaga.create).not.toHaveBeenCalled();
    });
  });

  describe('listar', () => {
    it('un Propietario solo ve plagas de sus lotes', async () => {
      await service.listar(propietario, { page: 1, limit: 10 });

      expect(whereDe(prisma.registroPlaga.findMany).lote).toEqual({
        galpon: { granja: { propietario_id: 5 } },
      });
    });

    it('un Admin no filtra por dueño', async () => {
      await service.listar(admin, { page: 1, limit: 10 });

      expect(whereDe(prisma.registroPlaga.findMany)).toBeUndefined();
    });
  });

  describe('obtener', () => {
    it('un Propietario no puede ver una plaga ajena (403)', async () => {
      prisma.registroPlaga.findUnique.mockResolvedValue({
        id: 1,
        lote: { galpon: { granja: { propietario_id: 999 } } },
      });

      await expect(service.obtener(1, propietario)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rechaza (404) si el registro no existe', async () => {
      prisma.registroPlaga.findUnique.mockResolvedValue(null);

      await expect(service.obtener(1, admin)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('actualizar', () => {
    it('actualiza cuando el registro es del solicitante', async () => {
      prisma.registroPlaga.findUnique.mockResolvedValue({
        id: 1,
        lote: { galpon: { granja: { propietario_id: 5 } } },
      });
      prisma.registroPlaga.update.mockResolvedValue({ id: 1 });

      await service.actualizar(1, { control_aplicado: 'Cebos' }, propietario);

      expect(prisma.registroPlaga.update).toHaveBeenCalled();
    });

    it('al mover a otro lote, re-valida que el nuevo sea suyo (403)', async () => {
      prisma.registroPlaga.findUnique.mockResolvedValue({
        id: 1,
        lote: { galpon: { granja: { propietario_id: 5 } } },
      });
      prisma.lote.findUnique.mockResolvedValue({
        id: 9,
        galpon: { granja: { propietario_id: 999 } },
      });

      await expect(
        service.actualizar(1, { lote_id: 9 }, propietario),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.registroPlaga.update).not.toHaveBeenCalled();
    });
  });

  describe('eliminar', () => {
    it('elimina (borrado físico) cuando es dueño', async () => {
      prisma.registroPlaga.findUnique.mockResolvedValue({
        id: 1,
        lote: { galpon: { granja: { propietario_id: 5 } } },
      });
      prisma.registroPlaga.delete.mockResolvedValue({ id: 1 });

      const res = await service.eliminar(1, propietario);

      expect(res).toEqual({ id: 1, eliminado: true });
    });

    it('un Propietario no puede eliminar una plaga ajena (403)', async () => {
      prisma.registroPlaga.findUnique.mockResolvedValue({
        id: 1,
        lote: { galpon: { granja: { propietario_id: 999 } } },
      });

      await expect(service.eliminar(1, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.registroPlaga.delete).not.toHaveBeenCalled();
    });
  });
});
