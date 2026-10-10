import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { OrganizacionesService } from './organizaciones.service';

describe('OrganizacionesService', () => {
  let service: OrganizacionesService;

  const prisma = {
    organizacion: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    sesion: { updateMany: jest.fn() },
    usuarioGalpon: { updateMany: jest.fn() },
    usuario: { updateMany: jest.fn() },
    granja: { updateMany: jest.fn() },
    $transaction: jest.fn(),
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizacionesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(OrganizacionesService);
  });

  afterEach(() => jest.clearAllMocks());

  it('lista organizaciones paginadas y ordenadas por nombre', async () => {
    prisma.$transaction.mockResolvedValue([[{ id: 1, nombre: 'Avícola' }], 1]);

    const resultado = await service.listar({ page: 2, limit: 5 });

    expect(prisma.organizacion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { nombre: 'asc' },
        skip: 5,
        take: 5,
      }),
    );
    expect(resultado.meta).toEqual({
      total: 1,
      page: 2,
      limit: 5,
      totalPages: 1,
    });
  });

  it('crea una organización normalizando nombre y NIT', async () => {
    prisma.organizacion.create.mockResolvedValue({ id: 1 });

    await service.crear({ nombre: '  Avícola  ', nit: ' 900-1 ' });

    expect(prisma.organizacion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { nombre: 'Avícola', nit: '900-1', plan: undefined },
      }),
    );
  });

  describe('desactivar', () => {
    const orden = (mock: jest.Mock, llamada = 0) =>
      mock.mock.invocationCallOrder[llamada];
    const sql = (llamada: number) =>
      (prisma.$queryRaw.mock.calls[llamada] as [TemplateStringsArray])[0].join(
        '?',
      );
    const errorDriver = (codigo: string) => {
      const e = new Error('error del driver');
      e.name = 'DriverAdapterError';
      (e as Error & { cause: unknown }).cause = { originalCode: codigo };
      return e;
    };

    beforeEach(() => {
      prisma.organizacion.findUnique.mockResolvedValue({ id: 4 });
      prisma.$transaction.mockImplementation((operacion: unknown) =>
        (operacion as (tx: typeof prisma) => unknown)(prisma),
      );
      prisma.$executeRaw.mockResolvedValue(0);
      prisma.$queryRaw.mockResolvedValue([{ id: 7 }, { id: 9 }]);
    });

    it('desactiva el tenant y revoca todos sus accesos solo sobre filas bloqueadas', async () => {
      await expect(service.desactivar(4)).resolves.toEqual({
        id: 4,
        activa: false,
      });

      expect(prisma.usuario.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [7, 9] }, activo: true },
        data: { activo: false },
      });
      expect(prisma.sesion.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [7, 9] } },
        data: { revocada: true },
      });
      expect(prisma.usuarioGalpon.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [7, 9] } },
        data: { activa: false },
      });
      expect(prisma.granja.updateMany).toHaveBeenCalledWith({
        where: { organizacion_id: 4, activa: true },
        data: { activa: false },
      });
      expect(prisma.organizacion.update).toHaveBeenCalledWith({
        where: { id: 4 },
        data: { activa: false },
      });
    });

    it('bloquea usuarios, luego sesiones y luego asignaciones, en READ COMMITTED con espera máxima', async () => {
      await service.desactivar(4);

      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
        isolationLevel: 'ReadCommitted',
        timeout: 10000,
      });
      expect(
        String((prisma.$executeRaw.mock.calls[0] as [TemplateStringsArray])[0]),
      ).toContain("lock_timeout = '5000ms'");
      expect(sql(0)).toContain('"usuarios"');
      expect(sql(0)).toContain('ORDER BY "id" FOR NO KEY UPDATE');
      expect(sql(1)).toContain('"sesiones"');
      expect(sql(1)).toContain('ORDER BY s."id" FOR UPDATE OF s');
      expect(sql(2)).toContain('"usuarios_galpones"');
      expect(sql(2)).toContain('ORDER BY ug."id" FOR UPDATE OF ug');
      expect(orden(prisma.$queryRaw, 0)).toBeLessThan(
        orden(prisma.usuario.updateMany),
      );
      expect(orden(prisma.usuario.updateMany)).toBeLessThan(
        orden(prisma.$queryRaw, 1),
      );
      expect(orden(prisma.$queryRaw, 1)).toBeLessThan(
        orden(prisma.sesion.updateMany),
      );
      expect(orden(prisma.sesion.updateMany)).toBeLessThan(
        orden(prisma.$queryRaw, 2),
      );
      expect(orden(prisma.$queryRaw, 2)).toBeLessThan(
        orden(prisma.usuarioGalpon.updateMany),
      );
      expect(orden(prisma.usuarioGalpon.updateMany)).toBeLessThan(
        orden(prisma.granja.updateMany),
      );
    });

    it('traduce solo 55P03 a 409', async () => {
      prisma.$transaction.mockRejectedValueOnce(errorDriver('55P03'));
      await expect(service.desactivar(4)).rejects.toThrow(
        'La organización está siendo modificada por otra operación; intenta de nuevo',
      );

      const deadlock = errorDriver('40P01');
      prisma.$transaction.mockRejectedValueOnce(deadlock);
      await expect(service.desactivar(4)).rejects.toBe(deadlock);

      const vencida = Object.assign(new Error('expired'), { code: 'P2028' });
      prisma.$transaction.mockRejectedValueOnce(vencida);
      await expect(service.desactivar(4)).rejects.toBe(vencida);
    });
  });
});
