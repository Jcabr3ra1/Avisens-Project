import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProveedoresService } from './proveedores.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ProveedoresService', () => {
  let service: ProveedoresService;

  const prisma = {
    proveedor: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const dtoCrear = { nombre: 'Alimentos del Campo', nit: '900123456-7' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProveedoresService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<ProveedoresService>(ProveedoresService);

    prisma.$transaction.mockResolvedValue([[], 0]);
  });

  afterEach(() => jest.clearAllMocks());

  it('crea el proveedor con los datos recibidos', async () => {
    prisma.proveedor.create.mockResolvedValue({ id: 1 });

    await service.crear(dtoCrear);

    const calls = prisma.proveedor.create.mock.calls as Array<
      [{ data: Record<string, unknown> }]
    >;
    expect(calls[0][0].data.nit).toBe('900123456-7');
  });

  it('obtener rechaza (404) si el proveedor no existe', async () => {
    prisma.proveedor.findUnique.mockResolvedValue(null);

    await expect(service.obtener(99)).rejects.toThrow(NotFoundException);
  });

  it('actualizar valida existencia antes de escribir (404, no muta)', async () => {
    prisma.proveedor.findUnique.mockResolvedValue(null);

    await expect(service.actualizar(99, { nombre: 'X' })).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.proveedor.update).not.toHaveBeenCalled();
  });

  it('eliminarPermanente valida existencia antes de borrar (404, no borra)', async () => {
    prisma.proveedor.findUnique.mockResolvedValue(null);

    await expect(service.eliminarPermanente(99)).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.proveedor.delete).not.toHaveBeenCalled();
  });

  it('desactivar hace borrado suave (activo:false) tras validar existencia', async () => {
    prisma.proveedor.findUnique.mockResolvedValue({ id: 1, activo: true });
    prisma.proveedor.update.mockResolvedValue({ id: 1, activo: false });

    const res = await service.desactivar(1);

    expect(prisma.proveedor.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { activo: false },
    });
    expect(res).toEqual({ id: 1, activo: false });
  });
});
