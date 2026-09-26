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

    prisma.tipoAlimento.findMany.mockResolvedValue([]);
    prisma.tipoAlimento.count.mockResolvedValue(0);
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

  describe('listar', () => {
    const argsDeFindMany = (): Record<string, unknown> => {
      const calls = prisma.tipoAlimento.findMany.mock.calls as Array<
        [Record<string, unknown>]
      >;
      return calls[0][0];
    };

    // El desplegable del consumo diario no debe ofrecer un alimento retirado.
    it('por defecto deja fuera los inactivos', async () => {
      await service.listar({ page: 1, limit: 20 });

      expect(argsDeFindMany().where).toEqual({ activo: true });
    });

    // La pantalla de catálogos necesita verlos todos para reactivar uno.
    it('con solo_activos en false los trae todos', async () => {
      await service.listar({ page: 1, limit: 20, solo_activos: false });

      expect(argsDeFindMany().where).toEqual({});
    });

    it('filtra por marca sin perder el filtro de activos', async () => {
      await service.listar({ page: 1, limit: 20, marca: 'italcol' });

      expect(argsDeFindMany().where).toEqual({
        marca: 'italcol',
        activo: true,
      });
    });

    // Se usan en orden de vida del pollo: preiniciador primero, engorde al
    // final. Por id salía primero el último que alguien creó.
    it('ordena por día de vida, no por id', async () => {
      await service.listar({ page: 1, limit: 20 });

      expect(argsDeFindMany().orderBy).toEqual([
        { dia_inicio: 'asc' },
        { nombre: 'asc' },
      ]);
    });

    it('cuenta con el mismo filtro que lista', async () => {
      await service.listar({ page: 1, limit: 20, marca: 'solla' });

      const calls = prisma.tipoAlimento.count.mock.calls as Array<
        [{ where: unknown }]
      >;
      expect(calls[0][0].where).toEqual(argsDeFindMany().where);
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
