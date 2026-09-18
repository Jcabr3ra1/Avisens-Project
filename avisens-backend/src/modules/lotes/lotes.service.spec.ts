import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { LotesService } from './lotes.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('LotesService', () => {
  let service: LotesService;

  const prisma = {
    lote: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    galpon: { findUnique: jest.fn() },
    proveedor: { findUnique: jest.fn() },
    lineaGenetica: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };

  const admin = { id: 1, rol: 'Administrador' };
  const propietario = { id: 5, rol: 'Propietario' };
  type TransaccionPrueba = (cliente: typeof prisma) => Promise<unknown>;

  const esTransaccionPrueba = (
    operacion: unknown,
  ): operacion is TransaccionPrueba => typeof operacion === 'function';

  const dtoCrear = {
    galpon_id: 3,
    proveedor_id: 7,
    fecha_ingreso: '2026-08-06',
    cantidad_inicial: 5000,
    raza: 'Ross 308',
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
      providers: [LotesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<LotesService>(LotesService);

    prisma.$transaction.mockImplementation((operacion: unknown) => {
      if (esTransaccionPrueba(operacion)) return operacion(prisma);
      return Promise.resolve([[], 0]);
    });
    prisma.galpon.findUnique.mockResolvedValue({
      id: 3,
      granja: { propietario_id: 5 },
    });
    prisma.proveedor.findUnique.mockResolvedValue({ id: 7 });
    prisma.lineaGenetica.findUnique.mockResolvedValue({ id: 2, activo: true });
    prisma.lote.findFirst.mockResolvedValue(null);
  });

  afterEach(() => jest.clearAllMocks());

  describe('crear', () => {
    it('crea el lote cuando el galpón es del solicitante', async () => {
      prisma.lote.create.mockResolvedValue({ id: 25 });
      prisma.lote.update.mockResolvedValue({
        id: 25,
        codigo: 'LOT-2026-000025',
      });

      const resultado = await service.crear(dtoCrear, propietario);

      expect(prisma.lote.create).toHaveBeenCalled();
      expect(dataDe(prisma.lote.create).fecha_ingreso).toBeInstanceOf(Date);
      expect(dataDe(prisma.lote.create).codigo).toMatch(/^TEMP-/);
      expect(dataDe(prisma.lote.update).codigo).toBe('LOT-2026-000025');
      expect(resultado.codigo).toBe('LOT-2026-000025');
    });

    it('un Propietario no puede crear en un galpón ajeno (403)', async () => {
      prisma.galpon.findUnique.mockResolvedValue({
        id: 3,
        granja: { propietario_id: 999 },
      });

      await expect(service.crear(dtoCrear, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.lote.create).not.toHaveBeenCalled();
    });

    it('rechaza (404) si el galpón no existe', async () => {
      prisma.galpon.findUnique.mockResolvedValue(null);

      await expect(service.crear(dtoCrear, admin)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.lote.create).not.toHaveBeenCalled();
    });

    it('rechaza (404) si el proveedor no existe', async () => {
      prisma.proveedor.findUnique.mockResolvedValue(null);

      await expect(service.crear(dtoCrear, admin)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.lote.create).not.toHaveBeenCalled();
    });

    it('rechaza (409) si el galpón ya tiene un lote activo', async () => {
      prisma.lote.findFirst.mockResolvedValue({ id: 99 });

      await expect(service.crear(dtoCrear, propietario)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.lote.create).not.toHaveBeenCalled();
    });

    it('crea el lote sin proveedor cuando aún no se ha definido', async () => {
      prisma.lote.create.mockResolvedValue({ id: 26 });
      prisma.lote.update.mockResolvedValue({
        id: 26,
        codigo: 'LOT-2026-000026',
      });
      const dtoSinProveedor = {
        galpon_id: dtoCrear.galpon_id,
        fecha_ingreso: dtoCrear.fecha_ingreso,
        cantidad_inicial: dtoCrear.cantidad_inicial,
        raza: dtoCrear.raza,
      };

      await service.crear(dtoSinProveedor, propietario);

      expect(prisma.proveedor.findUnique).not.toHaveBeenCalled();
      expect(dataDe(prisma.lote.create).proveedor_id).toBeNull();
    });

    it('crea el lote con la linea genetica indicada, ya validada como activa', async () => {
      prisma.lote.create.mockResolvedValue({ id: 27 });
      prisma.lote.update.mockResolvedValue({
        id: 27,
        codigo: 'LOT-2026-000027',
      });

      await service.crear({ ...dtoCrear, linea_genetica_id: 2 }, admin);

      expect(prisma.lineaGenetica.findUnique).toHaveBeenCalledWith({
        where: { id: 2 },
        select: { id: true, activo: true },
      });
      expect(dataDe(prisma.lote.create).linea_genetica_id).toBe(2);
    });

    it('rechaza (404) si la linea genetica no existe', async () => {
      prisma.lineaGenetica.findUnique.mockResolvedValue(null);

      await expect(
        service.crear({ ...dtoCrear, linea_genetica_id: 2 }, admin),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.lote.create).not.toHaveBeenCalled();
    });

    it('rechaza (400) si la linea genetica esta inactiva', async () => {
      prisma.lineaGenetica.findUnique.mockResolvedValue({
        id: 2,
        activo: false,
      });

      await expect(
        service.crear({ ...dtoCrear, linea_genetica_id: 2 }, admin),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.lote.create).not.toHaveBeenCalled();
    });

    it('crea el lote sin linea genetica cuando no se indica (no valida nada)', async () => {
      prisma.lote.create.mockResolvedValue({ id: 28 });
      prisma.lote.update.mockResolvedValue({
        id: 28,
        codigo: 'LOT-2026-000028',
      });

      await service.crear(dtoCrear, admin);

      expect(prisma.lineaGenetica.findUnique).not.toHaveBeenCalled();
      expect(dataDe(prisma.lote.create).linea_genetica_id).toBeNull();
    });
  });

  describe('listar', () => {
    it('un Propietario solo ve lotes de sus galpones', async () => {
      await service.listar(propietario, { page: 1, limit: 10 });

      expect(whereDe(prisma.lote.findMany).galpon).toEqual({
        granja: { propietario_id: 5 },
      });
    });

    it('un Admin no filtra por dueño', async () => {
      await service.listar(admin, { page: 1, limit: 10 });

      expect(whereDe(prisma.lote.findMany)).toBeUndefined();
    });
  });

  describe('obtener', () => {
    it('un Propietario no puede ver un lote ajeno (403)', async () => {
      prisma.lote.findUnique.mockResolvedValue({
        id: 1,
        galpon: { granja: { propietario_id: 999 } },
      });

      await expect(service.obtener(1, propietario)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rechaza (404) si el lote no existe', async () => {
      prisma.lote.findUnique.mockResolvedValue(null);

      await expect(service.obtener(1, admin)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('actualizar', () => {
    it('actualiza cuando el lote es del solicitante', async () => {
      prisma.lote.findUnique.mockResolvedValue({
        id: 1,
        galpon: { id: 3, granja: { propietario_id: 5 } },
      });
      prisma.lote.update.mockResolvedValue({ id: 1 });

      await service.actualizar(1, { raza: 'Cobb 500' }, propietario);

      expect(prisma.lote.update).toHaveBeenCalled();
      expect(dataDe(prisma.lote.update)).not.toHaveProperty('codigo');
    });

    it('impide trasladar un lote a otro galpón para no romper su historial', async () => {
      prisma.lote.findUnique.mockResolvedValue({
        id: 1,
        galpon: { id: 3, granja: { propietario_id: 5 } },
      });

      await expect(
        service.actualizar(1, { galpon_id: 9 }, propietario),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.lote.update).not.toHaveBeenCalled();
    });

    it('permite retirar un proveedor asignado', async () => {
      prisma.lote.findUnique.mockResolvedValue({
        id: 1,
        galpon: { id: 3, granja: { propietario_id: 5 } },
      });
      prisma.lote.update.mockResolvedValue({ id: 1, proveedor: null });

      await service.actualizar(1, { proveedor_id: null }, propietario);

      expect(dataDe(prisma.lote.update).proveedor_id).toBeNull();
      expect(prisma.proveedor.findUnique).not.toHaveBeenCalled();
    });

    it('rechaza (409) poner estado activo si el galpón ya tiene otro lote activo', async () => {
      prisma.lote.findUnique.mockResolvedValue({
        id: 1,
        galpon: { id: 3, granja: { propietario_id: 5 } },
      });
      prisma.lote.findFirst.mockResolvedValue({ id: 42 });

      await expect(
        service.actualizar(1, { estado: 'activo' }, propietario),
      ).rejects.toThrow(ConflictException);
      expect(prisma.lote.update).not.toHaveBeenCalled();
    });

    it('no verifica exclusividad si el PATCH no cambia el estado', async () => {
      prisma.lote.findUnique.mockResolvedValue({
        id: 1,
        galpon: { id: 3, granja: { propietario_id: 5 } },
      });
      prisma.lote.update.mockResolvedValue({ id: 1 });

      await service.actualizar(1, { raza: 'Cobb 500' }, propietario);

      expect(prisma.lote.findFirst).not.toHaveBeenCalled();
    });

    it('asigna la linea genetica indicada, ya validada como activa', async () => {
      prisma.lote.findUnique.mockResolvedValue({
        id: 1,
        galpon: { id: 3, granja: { propietario_id: 5 } },
      });
      prisma.lote.update.mockResolvedValue({ id: 1 });

      await service.actualizar(1, { linea_genetica_id: 2 }, propietario);

      expect(prisma.lineaGenetica.findUnique).toHaveBeenCalledWith({
        where: { id: 2 },
        select: { id: true, activo: true },
      });
      expect(dataDe(prisma.lote.update).linea_genetica_id).toBe(2);
    });

    it('rechaza (400) asignar una linea genetica inactiva', async () => {
      prisma.lote.findUnique.mockResolvedValue({
        id: 1,
        galpon: { id: 3, granja: { propietario_id: 5 } },
      });
      prisma.lineaGenetica.findUnique.mockResolvedValue({
        id: 2,
        activo: false,
      });

      await expect(
        service.actualizar(1, { linea_genetica_id: 2 }, propietario),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.lote.update).not.toHaveBeenCalled();
    });

    it('permite desvincular la linea genetica con null, sin validar nada', async () => {
      prisma.lote.findUnique.mockResolvedValue({
        id: 1,
        galpon: { id: 3, granja: { propietario_id: 5 } },
      });
      prisma.lote.update.mockResolvedValue({ id: 1 });

      await service.actualizar(1, { linea_genetica_id: null }, propietario);

      expect(prisma.lineaGenetica.findUnique).not.toHaveBeenCalled();
      expect(dataDe(prisma.lote.update).linea_genetica_id).toBeNull();
    });
  });

  describe('activar', () => {
    it('activa el lote cuando el galpón no tiene otro activo', async () => {
      prisma.lote.findUnique.mockResolvedValue({
        id: 1,
        galpon: { id: 3, granja: { propietario_id: 5 } },
      });
      prisma.lote.update.mockResolvedValue({ id: 1, estado: 'activo' });

      const res = await service.activar(1, propietario);

      expect(dataDe(prisma.lote.update)).toEqual({ estado: 'activo' });
      expect(res.estado).toBe('activo');
    });

    it('rechaza (409) si el galpón ya tiene otro lote activo', async () => {
      prisma.lote.findUnique.mockResolvedValue({
        id: 1,
        galpon: { id: 3, granja: { propietario_id: 5 } },
      });
      prisma.lote.findFirst.mockResolvedValue({ id: 42 });

      await expect(service.activar(1, propietario)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.lote.update).not.toHaveBeenCalled();
    });

    it('excluye al propio lote de la búsqueda de otro activo', async () => {
      prisma.lote.findUnique.mockResolvedValue({
        id: 1,
        galpon: { id: 3, granja: { propietario_id: 5 } },
      });
      prisma.lote.update.mockResolvedValue({ id: 1, estado: 'activo' });

      await service.activar(1, propietario);

      expect(whereDe(prisma.lote.findFirst)).toMatchObject({
        galpon_id: 3,
        estado: 'activo',
        id: { not: 1 },
      });
    });
  });

  describe('desactivar / eliminarPermanente', () => {
    beforeEach(() => {
      prisma.lote.findUnique.mockResolvedValue({
        id: 1,
        galpon: { granja: { propietario_id: 5 } },
      });
    });

    it('desactiva (borrado suave) marcando estado inactivo', async () => {
      prisma.lote.update.mockResolvedValue({ id: 1, estado: 'inactivo' });

      const res = await service.desactivar(1, propietario);

      expect(dataDe(prisma.lote.update)).toEqual({ estado: 'inactivo' });
      expect(res.estado).toBe('inactivo');
    });

    it('un Propietario no puede desactivar un lote ajeno (403)', async () => {
      prisma.lote.findUnique.mockResolvedValue({
        id: 1,
        galpon: { granja: { propietario_id: 999 } },
      });

      await expect(service.desactivar(1, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.lote.update).not.toHaveBeenCalled();
    });

    it('elimina permanentemente cuando es dueño', async () => {
      prisma.lote.delete.mockResolvedValue({ id: 1 });

      const res = await service.eliminarPermanente(1, propietario);

      expect(res).toEqual({ id: 1, eliminado: true });
    });
  });
});
