import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConsumosDiariosService } from './consumos-diarios.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ConsumosDiariosService', () => {
  let service: ConsumosDiariosService;

  const prisma = {
    consumoDiario: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    lote: { findUnique: jest.fn() },
    tipoAlimento: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };

  const admin = { id: 1, rol: 'Administrador' };
  const propietario = { id: 5, rol: 'Propietario' };

  const dtoCrear = {
    lote_id: 3,
    fecha: '2026-08-09',
    alimento_kg: 45.5,
    agua_litros: 90,
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
        ConsumosDiariosService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<ConsumosDiariosService>(ConsumosDiariosService);

    prisma.$transaction.mockResolvedValue([[], 0]);
    prisma.lote.findUnique.mockResolvedValue({
      id: 3,
      galpon: { granja: { propietario_id: 5 } },
    });
    prisma.tipoAlimento.findUnique.mockResolvedValue({ id: 2 });
  });

  afterEach(() => jest.clearAllMocks());

  describe('crear', () => {
    it('crea el consumo y toma el usuario_id del token, no del DTO', async () => {
      prisma.consumoDiario.create.mockResolvedValue({ id: 1 });

      await service.crear(dtoCrear, propietario);

      expect(prisma.consumoDiario.create).toHaveBeenCalled();
      const data = dataDe(prisma.consumoDiario.create);
      expect(data.usuario_id).toBe(propietario.id);
      expect(data.fecha).toBeInstanceOf(Date);
    });

    it('valida el tipo de alimento cuando viene (404 si no existe)', async () => {
      prisma.tipoAlimento.findUnique.mockResolvedValue(null);

      await expect(
        service.crear({ ...dtoCrear, tipo_alimento_id: 99 }, propietario),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.consumoDiario.create).not.toHaveBeenCalled();
    });

    it('no consulta el tipo de alimento cuando no viene', async () => {
      prisma.consumoDiario.create.mockResolvedValue({ id: 1 });

      await service.crear(dtoCrear, propietario);

      expect(prisma.tipoAlimento.findUnique).not.toHaveBeenCalled();
    });

    it('un Propietario no puede registrar en un lote ajeno (403)', async () => {
      prisma.lote.findUnique.mockResolvedValue({
        id: 3,
        galpon: { granja: { propietario_id: 999 } },
      });

      await expect(service.crear(dtoCrear, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.consumoDiario.create).not.toHaveBeenCalled();
    });

    it('rechaza (404) si el lote no existe', async () => {
      prisma.lote.findUnique.mockResolvedValue(null);

      await expect(service.crear(dtoCrear, admin)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.consumoDiario.create).not.toHaveBeenCalled();
    });
  });

  describe('listar', () => {
    it('un Propietario solo ve consumos de sus lotes', async () => {
      await service.listar(propietario, { page: 1, limit: 10 });

      expect(whereDe(prisma.consumoDiario.findMany).lote).toEqual({
        galpon: { granja: { propietario_id: 5 } },
      });
    });

    it('un Admin no filtra por dueño', async () => {
      await service.listar(admin, { page: 1, limit: 10 });

      expect(whereDe(prisma.consumoDiario.findMany)).toBeUndefined();
    });
  });

  describe('obtener', () => {
    it('un Propietario no puede ver un consumo ajeno (403)', async () => {
      prisma.consumoDiario.findUnique.mockResolvedValue({
        id: 1,
        lote: { galpon: { granja: { propietario_id: 999 } } },
      });

      await expect(service.obtener(1, propietario)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rechaza (404) si el consumo no existe', async () => {
      prisma.consumoDiario.findUnique.mockResolvedValue(null);

      await expect(service.obtener(1, admin)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('actualizar', () => {
    it('actualiza cuando el consumo es del solicitante', async () => {
      prisma.consumoDiario.findUnique.mockResolvedValue({
        id: 1,
        lote: { galpon: { granja: { propietario_id: 5 } } },
      });
      prisma.consumoDiario.update.mockResolvedValue({ id: 1 });

      await service.actualizar(1, { agua_litros: 100 }, propietario);

      expect(prisma.consumoDiario.update).toHaveBeenCalled();
    });

    it('al mover a otro lote, re-valida que el nuevo sea suyo (403)', async () => {
      prisma.consumoDiario.findUnique.mockResolvedValue({
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
      expect(prisma.consumoDiario.update).not.toHaveBeenCalled();
    });
  });

  describe('eliminar', () => {
    it('elimina (borrado físico) cuando es dueño', async () => {
      prisma.consumoDiario.findUnique.mockResolvedValue({
        id: 1,
        lote: { galpon: { granja: { propietario_id: 5 } } },
      });
      prisma.consumoDiario.delete.mockResolvedValue({ id: 1 });

      const res = await service.eliminar(1, propietario);

      expect(res).toEqual({ id: 1, eliminado: true });
    });

    it('un Propietario no puede eliminar un consumo ajeno (403)', async () => {
      prisma.consumoDiario.findUnique.mockResolvedValue({
        id: 1,
        lote: { galpon: { granja: { propietario_id: 999 } } },
      });

      await expect(service.eliminar(1, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.consumoDiario.delete).not.toHaveBeenCalled();
    });
  });
});
