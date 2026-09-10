import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { CategoriasFinancierasService } from './categorias-financieras.service';

describe('CategoriasFinancierasService', () => {
  let service: CategoriasFinancierasService;

  const prisma = {
    categoriaFinanciera: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const paginacion = { page: 1, limit: 20 };

  const argsDe = (): Record<string, any> => {
    const llamadas = prisma.categoriaFinanciera.findMany.mock.calls as Array<
      [Record<string, any>]
    >;
    return llamadas[0][0];
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((ops: unknown) =>
      Array.isArray(ops) ? Promise.all(ops) : Promise.resolve(ops),
    );
    prisma.categoriaFinanciera.findMany.mockResolvedValue([]);
    prisma.categoriaFinanciera.count.mockResolvedValue(0);

    const modulo: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriasFinancierasService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = modulo.get(CategoriasFinancierasService);
  });

  describe('listar', () => {
    it('devuelve sólo las activas por defecto', async () => {
      await service.listar(paginacion);

      expect(argsDe().where).toEqual({ activo: true });
    });

    // Una categoría desactivada no debe ofrecerse en el desplegable de un
    // formulario nuevo, pero sí hace falta poder verla para entender un
    // movimiento viejo que la usó.
    it('con solo_activas en false trae también las desactivadas', async () => {
      await service.listar({ ...paginacion, solo_activas: false });

      expect(argsDe().where).toEqual({});
    });

    it('filtra por tipo cuando se pide', async () => {
      await service.listar({ ...paginacion, tipo: 'egreso' });

      expect(argsDe().where).toEqual({ tipo: 'egreso', activo: true });
    });

    // Es una lista para escoger a ojo, no un histórico: alfabética.
    it('ordena por nombre, no por id', async () => {
      await service.listar(paginacion);

      expect(argsDe().orderBy).toEqual({ nombre: 'asc' });
    });

    it('devuelve la envoltura paginada de siempre', async () => {
      prisma.categoriaFinanciera.findMany.mockResolvedValue([
        { id: 1, nombre: 'Venta de aves', tipo: 'ingreso' },
      ]);
      prisma.categoriaFinanciera.count.mockResolvedValue(5);

      const res = await service.listar(paginacion);

      expect(res.meta).toEqual({
        total: 5,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
      expect(res.data).toHaveLength(1);
    });

    it('expone id, nombre y tipo, que es lo que necesita el desplegable', async () => {
      await service.listar(paginacion);

      expect(argsDe().select).toMatchObject({
        id: true,
        nombre: true,
        tipo: true,
      });
    });

    it('respeta la paginación que le pasan', async () => {
      await service.listar({ page: 3, limit: 10 });

      expect(argsDe().skip).toBe(20);
      expect(argsDe().take).toBe(10);
    });
  });

  describe('obtener', () => {
    it('devuelve la categoría cuando existe', async () => {
      prisma.categoriaFinanciera.findUnique.mockResolvedValue({
        id: 3,
        nombre: 'Compra de alimento',
        tipo: 'egreso',
      });

      await expect(service.obtener(3)).resolves.toMatchObject({ id: 3 });
    });

    it('lanza 404 cuando no existe', async () => {
      prisma.categoriaFinanciera.findUnique.mockResolvedValue(null);

      await expect(service.obtener(99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
