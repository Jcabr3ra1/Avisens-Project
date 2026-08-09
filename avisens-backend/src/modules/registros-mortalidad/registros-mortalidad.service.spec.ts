import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RegistrosMortalidadService } from './registros-mortalidad.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('RegistrosMortalidadService', () => {
  let service: RegistrosMortalidadService;

  const prisma = {
    registroMortalidad: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    lote: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };

  const admin = { id: 1, rol: 'Administrador' };
  const propietario = { id: 5, rol: 'Propietario' };

  const dtoCrear = {
    lote_id: 3,
    fecha: '2026-08-08',
    cantidad_aves: 12,
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
        RegistrosMortalidadService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<RegistrosMortalidadService>(
      RegistrosMortalidadService,
    );

    prisma.$transaction.mockResolvedValue([[], 0]);
    // Por defecto el lote 3 es del propietario 5.
    prisma.lote.findUnique.mockResolvedValue({
      id: 3,
      galpon: { granja: { propietario_id: 5 } },
    });
  });

  afterEach(() => jest.clearAllMocks());

  describe('crear', () => {
    it('crea el registro y toma el usuario_id del token, no del DTO', async () => {
      prisma.registroMortalidad.create.mockResolvedValue({ id: 1 });

      await service.crear(dtoCrear, propietario);

      expect(prisma.registroMortalidad.create).toHaveBeenCalled();
      const data = dataDe(prisma.registroMortalidad.create);
      expect(data.usuario_id).toBe(propietario.id);
      expect(data.fecha).toBeInstanceOf(Date);
    });

    it('un Propietario no puede registrar en un lote ajeno (403)', async () => {
      prisma.lote.findUnique.mockResolvedValue({
        id: 3,
        galpon: { granja: { propietario_id: 999 } },
      });

      await expect(service.crear(dtoCrear, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.registroMortalidad.create).not.toHaveBeenCalled();
    });

    it('rechaza (404) si el lote no existe', async () => {
      prisma.lote.findUnique.mockResolvedValue(null);

      await expect(service.crear(dtoCrear, admin)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.registroMortalidad.create).not.toHaveBeenCalled();
    });
  });

  describe('listar', () => {
    it('un Propietario solo ve mortalidad de sus lotes', async () => {
      await service.listar(propietario, { page: 1, limit: 10 });

      expect(whereDe(prisma.registroMortalidad.findMany).lote).toEqual({
        galpon: { granja: { propietario_id: 5 } },
      });
    });

    it('un Admin no filtra por dueño', async () => {
      await service.listar(admin, { page: 1, limit: 10 });

      expect(whereDe(prisma.registroMortalidad.findMany)).toBeUndefined();
    });
  });

  describe('obtener', () => {
    it('un Propietario no puede ver un registro ajeno (403)', async () => {
      prisma.registroMortalidad.findUnique.mockResolvedValue({
        id: 1,
        lote: { galpon: { granja: { propietario_id: 999 } } },
      });

      await expect(service.obtener(1, propietario)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rechaza (404) si el registro no existe', async () => {
      prisma.registroMortalidad.findUnique.mockResolvedValue(null);

      await expect(service.obtener(1, admin)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('actualizar', () => {
    it('actualiza cuando el registro es del solicitante', async () => {
      prisma.registroMortalidad.findUnique.mockResolvedValue({
        id: 1,
        lote: { galpon: { granja: { propietario_id: 5 } } },
      });
      prisma.registroMortalidad.update.mockResolvedValue({ id: 1 });

      await service.actualizar(1, { cantidad_aves: 15 }, propietario);

      expect(prisma.registroMortalidad.update).toHaveBeenCalled();
    });

    it('al mover a otro lote, re-valida que el nuevo sea suyo (403)', async () => {
      prisma.registroMortalidad.findUnique.mockResolvedValue({
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
      expect(prisma.registroMortalidad.update).not.toHaveBeenCalled();
    });
  });

  describe('eliminar', () => {
    it('elimina (borrado físico) cuando es dueño', async () => {
      prisma.registroMortalidad.findUnique.mockResolvedValue({
        id: 1,
        lote: { galpon: { granja: { propietario_id: 5 } } },
      });
      prisma.registroMortalidad.delete.mockResolvedValue({ id: 1 });

      const res = await service.eliminar(1, propietario);

      expect(res).toEqual({ id: 1, eliminado: true });
    });

    it('un Propietario no puede eliminar un registro ajeno (403)', async () => {
      prisma.registroMortalidad.findUnique.mockResolvedValue({
        id: 1,
        lote: { galpon: { granja: { propietario_id: 999 } } },
      });

      await expect(service.eliminar(1, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.registroMortalidad.delete).not.toHaveBeenCalled();
    });
  });
});
