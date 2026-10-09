import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { GalponesService } from './galpones.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('GalponesService', () => {
  let service: GalponesService;

  const prisma = {
    galpon: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    granja: { findUnique: jest.fn() },
    usuarioGalpon: { updateMany: jest.fn(), deleteMany: jest.fn() },
    $transaction: jest.fn(),
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
  };

  const admin = { id: 1, rol: 'Administrador' };
  const propietario = { id: 5, rol: 'Propietario' };
  const operario = { id: 8, rol: 'Operario', organizacion_id: 10 };

  const dtoCrear = { granja_id: 3, nombre: 'Galpón Norte' };
  type TransaccionPrueba = (cliente: typeof prisma) => Promise<unknown>;

  const esTransaccionPrueba = (
    operacion: unknown,
  ): operacion is TransaccionPrueba => typeof operacion === 'function';

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
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GalponesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<GalponesService>(GalponesService);

    prisma.$transaction.mockImplementation((operacion: unknown) => {
      if (esTransaccionPrueba(operacion)) return operacion(prisma);
      return Promise.resolve([[], 0]);
    });
    prisma.granja.findUnique.mockResolvedValue({ id: 3, propietario_id: 5 });
    prisma.$executeRaw.mockReturnValue('espera-maxima');
    prisma.$queryRaw.mockReturnValue('bloqueo-galpon');
  });

  afterEach(() => jest.clearAllMocks());

  describe('crear', () => {
    it('crea el galpón cuando la granja es del solicitante', async () => {
      prisma.galpon.create.mockResolvedValue({ id: 12 });
      prisma.galpon.update.mockResolvedValue({
        id: 12,
        codigo: 'GAL-000012',
      });

      const resultado = await service.crear(dtoCrear, propietario);

      expect(prisma.galpon.create).toHaveBeenCalled();
      expect(dataDe(prisma.galpon.create).codigo).toMatch(/^TEMP-/);
      expect(dataDe(prisma.galpon.update).codigo).toBe('GAL-000012');
      expect(resultado.codigo).toBe('GAL-000012');
    });

    it('un Propietario no puede crear en una granja ajena (403)', async () => {
      prisma.granja.findUnique.mockResolvedValue({
        id: 3,
        propietario_id: 999,
      });

      await expect(service.crear(dtoCrear, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.galpon.create).not.toHaveBeenCalled();
    });

    it('rechaza (404) si la granja no existe', async () => {
      prisma.granja.findUnique.mockResolvedValue(null);

      await expect(service.crear(dtoCrear, admin)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.galpon.create).not.toHaveBeenCalled();
    });
  });

  describe('listar', () => {
    it('un Propietario solo ve galpones de sus granjas', async () => {
      await service.listar(propietario, { page: 1, limit: 10 });

      expect(whereDe(prisma.galpon.findMany).granja).toEqual({
        propietario_id: 5,
      });
    });

    it('un Admin no filtra por dueño', async () => {
      await service.listar(admin, { page: 1, limit: 10 });

      expect(whereDe(prisma.galpon.findMany)).toBeUndefined();
    });

    it('un Operario solo ve galpones con asignación activa', async () => {
      await service.listar(operario, { page: 1, limit: 10 });

      expect(whereDe(prisma.galpon.findMany)).toEqual({
        activo: true,
        granja: {
          activa: true,
          organizacion_id: 10,
          organizacion: { activa: true },
        },
        usuarios_galpones: {
          some: { usuario_id: 8, activa: true },
        },
      });
    });
  });

  describe('obtener', () => {
    it('rechaza (404) si el galpón no existe', async () => {
      prisma.galpon.findUnique.mockResolvedValue(null);

      await expect(service.obtener(1, admin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('un Propietario no puede ver un galpón ajeno (403)', async () => {
      prisma.galpon.findUnique.mockResolvedValue({
        id: 1,
        granja: { propietario_id: 999 },
      });

      await expect(service.obtener(1, propietario)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('actualizar', () => {
    it('actualiza cuando el galpón es del solicitante', async () => {
      prisma.galpon.findUnique.mockResolvedValue({
        id: 1,
        granja: { id: 3, propietario_id: 5 },
      });
      prisma.galpon.update.mockResolvedValue({ id: 1 });

      await service.actualizar(1, { nombre: 'Nuevo nombre' }, propietario);

      expect(prisma.galpon.update).toHaveBeenCalled();
    });

    describe('activo y asignaciones', () => {
      beforeEach(() => {
        prisma.galpon.findUnique.mockResolvedValue({
          id: 1,
          granja: { id: 3, propietario_id: 5 },
        });
        prisma.galpon.update.mockReturnValue('operacion-galpon');
        prisma.usuarioGalpon.updateMany.mockReturnValue(
          'operacion-asignaciones',
        );
        prisma.$transaction.mockResolvedValue([
          0,
          { id: 1, activo: false, nombre: 'Nuevo' },
          { count: 2 },
        ]);
      });

      it('activo:false revoca las asignaciones y actualiza el galpón en una sola transacción', async () => {
        const res = await service.actualizar(
          1,
          { activo: false, nombre: 'Nuevo' },
          admin,
        );

        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
        expect(prisma.$transaction).toHaveBeenCalledWith(
          ['espera-maxima', 'operacion-galpon', 'operacion-asignaciones'],
          { isolationLevel: 'ReadCommitted', timeout: 10000 },
        );
        expect(prisma.usuarioGalpon.updateMany).toHaveBeenCalledWith({
          where: { galpon_id: 1, activa: true },
          data: { activa: false },
        });
        expect(dataDe(prisma.galpon.update)).toMatchObject({
          activo: false,
          nombre: 'Nuevo',
        });
        expect(res).toEqual({ id: 1, activo: false, nombre: 'Nuevo' });
      });

      it('si falla la actualización del galpón la promesa se rechaza y no se devuelve nada', async () => {
        prisma.$transaction.mockRejectedValue(new Error('falla update'));

        await expect(
          service.actualizar(1, { activo: false }, admin),
        ).rejects.toThrow('falla update');
      });

      it('un PATCH sin activo no toca las asignaciones', async () => {
        prisma.galpon.update.mockResolvedValue({ id: 1 });

        await service.actualizar(1, { nombre: 'Otro' }, admin);

        expect(prisma.usuarioGalpon.updateMany).not.toHaveBeenCalled();
        expect(prisma.$transaction).not.toHaveBeenCalled();
      });

      it('activo:true no toca las asignaciones', async () => {
        prisma.galpon.update.mockResolvedValue({ id: 1, activo: true });

        await service.actualizar(1, { activo: true }, admin);

        expect(prisma.usuarioGalpon.updateMany).not.toHaveBeenCalled();
        expect(prisma.$transaction).not.toHaveBeenCalled();
      });
    });

    it('impide trasladar un galpón a otra granja para no romper su historial', async () => {
      prisma.galpon.findUnique.mockResolvedValue({
        id: 1,
        granja: { id: 3, propietario_id: 5 },
      });

      await expect(
        service.actualizar(1, { granja_id: 9 }, propietario),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.galpon.update).not.toHaveBeenCalled();
    });
  });

  describe('desactivar / eliminarPermanente', () => {
    beforeEach(() => {
      prisma.galpon.findUnique.mockResolvedValue({
        id: 1,
        granja: { propietario_id: 5 },
      });
    });

    it('desactiva (borrado suave) cuando es dueño', async () => {
      prisma.galpon.update.mockResolvedValue({ id: 1 });

      const res = await service.desactivar(1, propietario);

      expect(res).toEqual({ id: 1, activo: false });
      expect(prisma.usuarioGalpon.updateMany).toHaveBeenCalledWith({
        where: { galpon_id: 1, activa: true },
        data: { activa: false },
      });
    });

    it('elimina permanentemente cuando es dueño', async () => {
      prisma.galpon.delete.mockResolvedValue({ id: 1 });

      const res = await service.eliminarPermanente(1, propietario);

      expect(res).toEqual({ id: 1, eliminado: true });
      expect(prisma.usuarioGalpon.deleteMany).toHaveBeenCalledWith({
        where: { galpon_id: 1 },
      });
    });

    it('con lotes o sensores dentro avisa que hay que borrarlos primero', async () => {
      prisma.$transaction.mockRejectedValue(
        Object.assign(new Error('FK'), { code: 'P2003' }),
      );

      await expect(
        service.eliminarPermanente(1, propietario),
      ).rejects.toBeInstanceOf(ConflictException);
      await expect(service.eliminarPermanente(1, propietario)).rejects.toThrow(
        /lotes, sensores, equipos/,
      );
    });

    it('un error que no sea de llave foránea se propaga tal cual', async () => {
      prisma.$transaction.mockRejectedValue(new Error('se cayó la conexión'));

      await expect(service.eliminarPermanente(1, propietario)).rejects.toThrow(
        'se cayó la conexión',
      );
    });
  });
  describe('orden de bloqueos y esperas máximas', () => {
    const timeoutDeBloqueo = () => {
      const e = new Error('canceling statement due to lock timeout');
      e.name = 'DriverAdapterError';
      (e as Error & { cause: unknown }).cause = { originalCode: '55P03' };
      return e;
    };
    const deadlock = () => {
      const e = new Error('deadlock detected');
      e.name = 'DriverAdapterError';
      (e as Error & { cause: unknown }).cause = { originalCode: '40P01' };
      return e;
    };

    beforeEach(() => {
      prisma.galpon.findUnique.mockResolvedValue({
        id: 1,
        granja: { id: 3, propietario_id: 5 },
      });
      prisma.galpon.update.mockReturnValue('operacion-galpon');
      prisma.galpon.delete.mockReturnValue('borrar-galpon');
      prisma.usuarioGalpon.updateMany.mockReturnValue('operacion-asignaciones');
      prisma.usuarioGalpon.deleteMany.mockReturnValue('borrar-asignaciones');
      prisma.$transaction.mockResolvedValue([]);
    });

    it('DELETE desactiva con el galpón primero, las asignaciones después, espera máxima y READ COMMITTED', async () => {
      const res = await service.desactivar(1, admin);

      expect(res).toEqual({ id: 1, activo: false });
      expect(prisma.$transaction).toHaveBeenCalledWith(
        ['espera-maxima', 'operacion-galpon', 'operacion-asignaciones'],
        { isolationLevel: 'ReadCommitted', timeout: 10000 },
      );
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
      const [plantilla] = prisma.$executeRaw.mock.calls[0] as [
        TemplateStringsArray,
      ];
      expect(plantilla.join('?')).toContain("lock_timeout = '5000ms'");
    });

    it('la eliminación permanente bloquea el galpón antes de borrar asignaciones y galpón', async () => {
      const res = await service.eliminarPermanente(1, admin);

      expect(res).toEqual({ id: 1, eliminado: true });
      expect(prisma.$transaction).toHaveBeenCalledWith(
        [
          'espera-maxima',
          'bloqueo-galpon',
          'borrar-asignaciones',
          'borrar-galpon',
        ],
        { isolationLevel: 'ReadCommitted', timeout: 10000 },
      );
      const consulta = prisma.$queryRaw.mock.calls[0] as [
        TemplateStringsArray,
        number,
      ];
      expect(consulta[0].join('?')).toContain('FOR UPDATE');
      expect(consulta[1]).toBe(1);
    });

    it.each([
      [
        'PATCH activo:false',
        () => service.actualizar(1, { activo: false }, admin),
      ],
      ['DELETE', () => service.desactivar(1, admin)],
      ['DELETE permanente', () => service.eliminarPermanente(1, admin)],
    ])('%s traduce 55P03 a 409', async (_nombre, accion) => {
      prisma.$transaction.mockRejectedValue(timeoutDeBloqueo());

      const intento = accion();

      await expect(intento).rejects.toBeInstanceOf(ConflictException);
      await expect(accion()).rejects.toThrow(/siendo modificado/);
    });

    it.each([
      [
        'PATCH activo:false',
        () => service.actualizar(1, { activo: false }, admin),
      ],
      ['DELETE', () => service.desactivar(1, admin)],
      ['DELETE permanente', () => service.eliminarPermanente(1, admin)],
    ])(
      '%s NO traduce un deadlock ni otros errores',
      async (_nombre, accion) => {
        prisma.$transaction.mockRejectedValueOnce(deadlock());
        await expect(accion()).rejects.toMatchObject({
          name: 'DriverAdapterError',
        });

        prisma.$transaction.mockRejectedValueOnce(
          Object.assign(new Error('Transaction API error'), { code: 'P2028' }),
        );
        await expect(accion()).rejects.toMatchObject({ code: 'P2028' });
      },
    );

    it('PATCH sin activo o con activo:true no abre transacción ni fija esperas', async () => {
      prisma.galpon.update.mockResolvedValue({ id: 1 });

      await service.actualizar(1, { nombre: 'x' }, admin);
      await service.actualizar(1, { activo: true }, admin);

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.$executeRaw).not.toHaveBeenCalled();
    });
  });
});
