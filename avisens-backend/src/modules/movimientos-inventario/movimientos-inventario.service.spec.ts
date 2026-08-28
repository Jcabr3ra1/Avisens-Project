import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TipoMovimientoInventario } from '@prisma/client';
import { ROLES } from '../../common/auth/roles';
import { PrismaService } from '../../prisma/prisma.service';
import { InsumosService } from '../insumos/insumos.service';
import { MovimientosInventarioService } from './movimientos-inventario.service';

describe('MovimientosInventarioService', () => {
  let service: MovimientosInventarioService;
  const prisma = {
    movimientoInventario: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const insumosService = { registrarMovimiento: jest.fn() };
  const administrador = { id: 1, rol: ROLES.ADMINISTRADOR };
  const propietario = { id: 7, rol: ROLES.PROPIETARIO };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MovimientosInventarioService,
        { provide: PrismaService, useValue: prisma },
        { provide: InsumosService, useValue: insumosService },
      ],
    }).compile();
    service = module.get(MovimientosInventarioService);
    prisma.$transaction.mockResolvedValue([[], 0]);
  });

  it('delega el alta a la transacción de insumos con el usuario autenticado', async () => {
    insumosService.registrarMovimiento.mockResolvedValue({ id: 1 });
    const dto = {
      insumo_id: 3,
      tipo_movimiento: TipoMovimientoInventario.entrada,
      cantidad: 50,
    };

    await expect(service.crear(dto, propietario)).resolves.toEqual({ id: 1 });
    expect(insumosService.registrarMovimiento).toHaveBeenCalledWith(
      3,
      expect.objectContaining({
        tipo_movimiento: TipoMovimientoInventario.entrada,
        cantidad: 50,
      }),
      propietario,
    );
  });

  it('limita el historial del propietario a sus granjas', async () => {
    await service.listar(propietario, { page: 1, limit: 20 });
    const llamadas = prisma.movimientoInventario.findMany.mock
      .calls as unknown as Array<[{ where: Record<string, unknown> }]>;
    const argumentos = llamadas[0][0];
    expect(argumentos.where).toMatchObject({
      insumo: { granja: { propietario_id: propietario.id } },
    });
  });

  it('permite al administrador consultar todo el historial', async () => {
    await service.listar(administrador, { page: 1, limit: 20 });
    const llamadas = prisma.movimientoInventario.findMany.mock
      .calls as unknown as Array<[{ where: Record<string, unknown> }]>;
    const argumentos = llamadas[0][0];
    expect(argumentos.where).not.toHaveProperty('insumo');
  });

  it('lanza NotFound al obtener un movimiento no accesible', async () => {
    prisma.movimientoInventario.findFirst.mockResolvedValue(null);
    await expect(service.obtener(99, propietario)).rejects.toThrow(
      NotFoundException,
    );
  });
});
