import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsuariosService } from './usuarios.service';
import { PrismaService } from '../../prisma/prisma.service';

jest.mock('bcrypt');

describe('UsuariosService', () => {
  let service: UsuariosService;

  const prisma = {
    rol: { findUnique: jest.fn(), findMany: jest.fn() },
    organizacion: { findFirst: jest.fn(), create: jest.fn() },
    usuario: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    sesion: { updateMany: jest.fn(), deleteMany: jest.fn() },
    seguridadCuenta: { deleteMany: jest.fn() },
    galpon: { findUnique: jest.fn() },
    usuarioGalpon: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
  };

  const hashMock = bcrypt.hash as unknown as jest.Mock;

  const admin = { id: 1, rol: 'Administrador' };
  const propietario = {
    id: 5,
    rol: 'Propietario',
    organizacion_id: 10,
  };

  const dtoCrear = {
    nombre_completo: 'María López',
    cedula: '1098765432',
    email: 'maria@granja.com',
    password: 'contraseña123',
    rol_id: 2,
  };

  const dataDe = (mock: jest.Mock): Record<string, unknown> => {
    const calls = mock.mock.calls as Array<[{ data: Record<string, unknown> }]>;
    return calls[0][0].data;
  };

  const argumentosDe = (mock: jest.Mock): Record<string, unknown> => {
    const calls = mock.mock.calls as Array<[Record<string, unknown>]>;
    return calls[0][0];
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<UsuariosService>(UsuariosService);

    hashMock.mockResolvedValue('hash_fake');
    prisma.usuario.findFirst.mockResolvedValue(null);
    prisma.$transaction.mockImplementation((operacion: unknown) =>
      typeof operacion === 'function'
        ? (operacion as (tx: typeof prisma) => unknown)(prisma)
        : Promise.resolve([[], 0]),
    );
    prisma.organizacion.create.mockResolvedValue({ id: 10 });
    prisma.$executeRaw.mockResolvedValue(0);
    prisma.$queryRaw.mockResolvedValue([{ id: 40 }, { id: 41 }]);
  });

  afterEach(() => jest.clearAllMocks());

  describe('crear', () => {
    it('un Propietario siempre crea Operarios, ignorando el rol_id que mande', async () => {
      prisma.rol.findUnique.mockResolvedValue({ id: 3, nombre: 'Operario' });
      prisma.usuario.create.mockResolvedValue({ id: 99 });

      await service.crear({ ...dtoCrear, rol_id: 1 }, propietario);

      expect(prisma.rol.findUnique).toHaveBeenCalledWith({
        where: { nombre: 'Operario' },
      });
      expect(dataDe(prisma.usuario.create).rol_id).toBe(3);
      expect(dataDe(prisma.usuario.create).organizacion_id).toBe(10);
    });

    it('un Admin crea con el rol_id que indique', async () => {
      prisma.rol.findUnique.mockResolvedValue({
        id: 2,
        nombre: 'Propietario',
      });
      prisma.usuario.create.mockResolvedValue({ id: 99 });

      await service.crear(dtoCrear, admin);

      expect(prisma.rol.findUnique).toHaveBeenCalledWith({ where: { id: 2 } });
      expect(dataDe(prisma.usuario.create).rol_id).toBe(2);
      expect(prisma.organizacion.create).toHaveBeenCalled();
      expect(dataDe(prisma.usuario.create).organizacion_id).toBe(10);
    });

    it('un Admin asigna un Operario a una organización existente', async () => {
      prisma.rol.findUnique.mockResolvedValue({ id: 3, nombre: 'Operario' });
      prisma.organizacion.findFirst.mockResolvedValue({ id: 20 });
      prisma.usuario.create.mockResolvedValue({ id: 99 });

      await service.crear(
        { ...dtoCrear, rol_id: 3, organizacion_id: 20 },
        admin,
      );

      expect(prisma.organizacion.findFirst).toHaveBeenCalledWith({
        where: { id: 20, activa: true },
        select: { id: true },
      });
      expect(dataDe(prisma.usuario.create).organizacion_id).toBe(20);
    });

    it('rechaza (404) si el rol indicado no existe', async () => {
      prisma.rol.findUnique.mockResolvedValue(null);

      await expect(service.crear(dtoCrear, admin)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.usuario.create).not.toHaveBeenCalled();
    });

    it('hashea la contraseña (nunca la guarda en texto plano)', async () => {
      prisma.rol.findUnique.mockResolvedValue({
        id: 2,
        nombre: 'Propietario',
      });
      prisma.usuario.create.mockResolvedValue({ id: 99 });

      await service.crear(dtoCrear, admin);

      expect(hashMock).toHaveBeenCalledWith('contraseña123', 12);
      const data = dataDe(prisma.usuario.create);
      expect(data.password_hash).toBe('hash_fake');
      expect(data).not.toHaveProperty('password');
    });
  });

  describe('listar', () => {
    it('un Propietario solo consulta Operarios', async () => {
      await service.listar(propietario, { page: 1, limit: 10 });

      expect(prisma.usuario.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            rol: { nombre: 'Operario' },
            organizacion_id: 10,
          },
        }),
      );
    });

    it('un Admin consulta a todos (sin filtro de rol)', async () => {
      await service.listar(admin, { page: 1, limit: 10 });

      expect(prisma.usuario.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined }),
      );
    });
  });

  describe('listarRoles', () => {
    it('entrega todos los roles al Administrador', async () => {
      await service.listarRoles(admin);

      expect(prisma.rol.findMany).toHaveBeenCalledWith({
        where: undefined,
        select: { id: true, nombre: true },
        orderBy: { id: 'asc' },
      });
    });

    it('entrega solo el rol Operario al Propietario', async () => {
      await service.listarRoles(propietario);

      expect(prisma.rol.findMany).toHaveBeenCalledWith({
        where: { nombre: 'Operario' },
        select: { id: true, nombre: true },
        orderBy: { id: 'asc' },
      });
    });
  });

  describe('obtener', () => {
    it('rechaza (404) si el usuario no existe', async () => {
      prisma.usuario.findUnique.mockResolvedValue(null);

      await expect(service.obtener(20, admin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('un Propietario no puede ver a un no-operario (403)', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        id: 2,
        organizacion_id: 10,
        rol: { nombre: 'Administrador' },
      });

      await expect(service.obtener(2, propietario)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('un Propietario no puede ver un Operario de otra organización', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        id: 21,
        organizacion_id: 99,
        rol: { nombre: 'Operario' },
      });

      await expect(service.obtener(21, propietario)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('actualizar', () => {
    it('un Propietario no puede cambiar el rol de su operario', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        id: 20,
        email: 'op@x.com',
        cedula: '123',
        organizacion_id: 10,
        rol: { nombre: 'Operario' },
      });
      prisma.usuario.update.mockResolvedValue({ id: 20 });

      await service.actualizar(20, { rol_id: 1 }, propietario);

      expect(dataDe(prisma.usuario.update).rol_id).toBeUndefined();
    });

    it('rechaza (409) si el email nuevo choca con otro usuario', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        id: 20,
        email: 'op@x.com',
        cedula: '123',
        organizacion_id: 10,
        rol: { nombre: 'Operario' },
      });
      prisma.usuario.findFirst.mockResolvedValue({ id: 99 });

      await expect(
        service.actualizar(20, { email: 'nuevo@x.com' }, admin),
      ).rejects.toThrow(ConflictException);
      expect(prisma.usuario.update).not.toHaveBeenCalled();
    });
  });

  describe('asignaciones de galpón', () => {
    const operario = {
      id: 20,
      activo: true,
      organizacion_id: 10,
      rol: { nombre: 'Operario' },
    };
    const galpon = {
      id: 30,
      activo: true,
      granja: { propietario_id: 5, organizacion_id: 10 },
    };

    beforeEach(() => {
      prisma.$transaction.mockImplementation((operacion: unknown) =>
        typeof operacion === 'function'
          ? (operacion as (cliente: typeof prisma) => unknown)(prisma)
          : Promise.resolve(operacion),
      );
    });

    it('un Propietario asigna un Operario de su organización a su galpón', async () => {
      prisma.usuario.findUnique.mockResolvedValue(operario);
      prisma.galpon.findUnique.mockResolvedValue(galpon);
      prisma.usuarioGalpon.upsert.mockResolvedValue({ id: 40, activa: true });

      await service.asignarGalpon(
        20,
        30,
        'Responsable de alimentación',
        propietario,
      );

      const argumentos = argumentosDe(prisma.usuarioGalpon.upsert);
      expect(argumentos.where).toEqual({
        usuario_id_galpon_id: { usuario_id: 20, galpon_id: 30 },
      });
      expect(argumentos.create).toEqual({
        usuario_id: 20,
        galpon_id: 30,
        rol_asignacion: 'Responsable de alimentación',
      });
    });

    it('reactiva la misma fila en vez de duplicar la asignación', async () => {
      prisma.usuario.findUnique.mockResolvedValue(operario);
      prisma.galpon.findUnique.mockResolvedValue(galpon);
      prisma.usuarioGalpon.upsert.mockResolvedValue({ id: 40, activa: true });

      await service.asignarGalpon(20, 30, undefined, propietario);

      const argumentos = argumentosDe(prisma.usuarioGalpon.upsert);
      const actualizacion = argumentos.update as Record<string, unknown>;
      expect(actualizacion.activa).toBe(true);
      expect(actualizacion.fecha_asignacion).toBeInstanceOf(Date);
    });

    it('rechaza asignar un usuario que no es Operario', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        ...operario,
        rol: { nombre: 'Propietario' },
      });

      await expect(
        service.asignarGalpon(20, 30, undefined, admin),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.usuarioGalpon.upsert).not.toHaveBeenCalled();
    });

    it('rechaza cruzar organizaciones aunque lo intente un Administrador', async () => {
      prisma.usuario.findUnique.mockResolvedValue(operario);
      prisma.galpon.findUnique.mockResolvedValue({
        ...galpon,
        granja: { propietario_id: 99, organizacion_id: 77 },
      });

      await expect(
        service.asignarGalpon(20, 30, undefined, admin),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.usuarioGalpon.upsert).not.toHaveBeenCalled();
    });

    it('un Propietario no asigna operarios a un galpón ajeno', async () => {
      prisma.usuario.findUnique.mockResolvedValue(operario);
      prisma.galpon.findUnique.mockResolvedValue({
        ...galpon,
        granja: { propietario_id: 99, organizacion_id: 10 },
      });

      await expect(
        service.asignarGalpon(20, 30, undefined, propietario),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.usuarioGalpon.upsert).not.toHaveBeenCalled();
    });

    it('no permite asignar un Operario inactivo', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        ...operario,
        activo: false,
      });

      await expect(
        service.asignarGalpon(20, 30, undefined, propietario),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.galpon.findUnique).not.toHaveBeenCalled();
    });

    describe('coordinación con la desactivación del galpón', () => {
      const orden = (mock: jest.Mock) => mock.mock.invocationCallOrder[0];
      const timeoutDeBloqueo = () => {
        const e = new Error('canceling statement due to lock timeout');
        e.name = 'DriverAdapterError';
        (e as Error & { cause: unknown }).cause = { originalCode: '55P03' };
        return e;
      };

      beforeEach(() => {
        prisma.$queryRaw.mockReset();
        prisma.$executeRaw.mockReset();
        prisma.usuarioGalpon.upsert.mockReset();
        prisma.usuario.findUnique.mockResolvedValue(operario);
        prisma.galpon.findUnique.mockResolvedValue(galpon);
        prisma.usuarioGalpon.upsert.mockResolvedValue({ id: 40, activa: true });
      });

      it('bloquea primero al usuario y después el galpón, todo en una transacción READ COMMITTED', async () => {
        await service.asignarGalpon(20, 30, undefined, propietario);

        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
        expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
          isolationLevel: 'ReadCommitted',
          timeout: 10000,
        });
        const [plantillaUsuario, idUsuario] = prisma.$queryRaw.mock
          .calls[0] as [TemplateStringsArray, number];
        expect(plantillaUsuario.join('?')).toContain('"usuarios"');
        expect(plantillaUsuario.join('?')).toContain('FOR SHARE');
        expect(idUsuario).toBe(20);
        const [plantilla, idBloqueado] = prisma.$queryRaw.mock.calls[1] as [
          TemplateStringsArray,
          number,
        ];
        expect(plantilla.join('?')).toContain('FOR NO KEY UPDATE');
        expect(idBloqueado).toBe(30);
        expect(
          String(
            (prisma.$executeRaw.mock.calls[0] as [TemplateStringsArray])[0],
          ),
        ).toContain("lock_timeout = '3000ms'");
        expect(orden(prisma.$executeRaw)).toBeLessThan(orden(prisma.$queryRaw));
        expect(orden(prisma.$queryRaw)).toBeLessThan(
          orden(prisma.usuario.findUnique),
        );
        expect(orden(prisma.usuario.findUnique)).toBeLessThan(
          prisma.$queryRaw.mock.invocationCallOrder[1],
        );
        expect(prisma.$queryRaw.mock.invocationCallOrder[1]).toBeLessThan(
          orden(prisma.galpon.findUnique),
        );
        expect(orden(prisma.galpon.findUnique)).toBeLessThan(
          orden(prisma.usuarioGalpon.upsert),
        );
      });

      it('un usuario que ya quedó inactivo tras el bloqueo es 400 y no toca el galpón', async () => {
        prisma.usuario.findUnique.mockResolvedValue({
          ...operario,
          activo: false,
        });

        await expect(
          service.asignarGalpon(20, 30, undefined, propietario),
        ).rejects.toThrow('No se puede asignar un Operario inactivo');
        expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
        expect(prisma.usuarioGalpon.upsert).not.toHaveBeenCalled();
      });

      it('un usuario eliminado antes de asignar es 404', async () => {
        prisma.usuario.findUnique.mockResolvedValue(null);

        await expect(
          service.asignarGalpon(20, 30, undefined, propietario),
        ).rejects.toThrow(NotFoundException);
        expect(prisma.usuarioGalpon.upsert).not.toHaveBeenCalled();
      });

      it('traduce 55P03 a 409 y no escribe', async () => {
        prisma.$queryRaw.mockRejectedValue(timeoutDeBloqueo());

        await expect(
          service.asignarGalpon(20, 30, undefined, propietario),
        ).rejects.toBeInstanceOf(ConflictException);
        await expect(
          service.asignarGalpon(20, 30, undefined, propietario),
        ).rejects.toThrow(
          'Hay otra operación modificando los datos de esta asignación; intenta de nuevo',
        );
        expect(prisma.usuarioGalpon.upsert).not.toHaveBeenCalled();
      });

      it('traduce también el 55P03 que sube del upsert', async () => {
        prisma.usuarioGalpon.upsert.mockRejectedValue(timeoutDeBloqueo());

        await expect(
          service.asignarGalpon(20, 30, undefined, propietario),
        ).rejects.toThrow(
          'Hay otra operación modificando los datos de esta asignación; intenta de nuevo',
        );
      });

      it('no convierte otros errores en conflictos (deadlock, P2002, P2028)', async () => {
        const deadlock = new Error('deadlock detected');
        deadlock.name = 'DriverAdapterError';
        (deadlock as Error & { cause: unknown }).cause = {
          originalCode: '40P01',
        };
        prisma.usuarioGalpon.upsert.mockRejectedValueOnce(deadlock);
        await expect(
          service.asignarGalpon(20, 30, undefined, propietario),
        ).rejects.toBe(deadlock);

        const unico = Object.assign(new Error('unique'), { code: 'P2002' });
        prisma.usuarioGalpon.upsert.mockRejectedValueOnce(unico);
        await expect(
          service.asignarGalpon(20, 30, undefined, propietario),
        ).rejects.toBe(unico);

        const vencida = Object.assign(new Error('expired'), { code: 'P2028' });
        prisma.$transaction.mockRejectedValueOnce(vencida);
        await expect(
          service.asignarGalpon(20, 30, undefined, propietario),
        ).rejects.toBe(vencida);
      });

      it('un galpón inexistente tras el bloqueo sigue siendo 404', async () => {
        prisma.galpon.findUnique.mockResolvedValue(null);

        await expect(
          service.asignarGalpon(20, 30, undefined, propietario),
        ).rejects.toThrow(NotFoundException);
        expect(prisma.usuarioGalpon.upsert).not.toHaveBeenCalled();
      });

      it('un galpón inactivo sigue siendo 400 con el mismo mensaje', async () => {
        prisma.galpon.findUnique.mockResolvedValue({
          ...galpon,
          activo: false,
        });

        await expect(
          service.asignarGalpon(20, 30, undefined, propietario),
        ).rejects.toThrow('No se puede asignar un galpón inactivo');
        expect(prisma.usuarioGalpon.upsert).not.toHaveBeenCalled();
      });

      it('desasignar no toma bloqueos de galpón ni abre transacción', async () => {
        prisma.usuarioGalpon.findUnique.mockResolvedValue({
          id: 40,
          activa: true,
        });
        prisma.usuarioGalpon.update.mockResolvedValue({ id: 40 });

        await service.desasignarGalpon(20, 30, propietario);

        expect(prisma.$queryRaw).not.toHaveBeenCalled();
        expect(prisma.$transaction).not.toHaveBeenCalled();
      });
    });

    it('lista solo las asignaciones a granjas del Propietario', async () => {
      prisma.usuario.findUnique.mockResolvedValue(operario);
      prisma.$transaction.mockResolvedValue([[{ id: 40 }], 1]);

      const resultado = await service.listarGalponesAsignados(20, propietario, {
        page: 1,
        limit: 10,
      });

      expect(prisma.usuarioGalpon.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            usuario_id: 20,
            galpon: { granja: { propietario_id: 5 } },
          },
        }),
      );
      expect(resultado.meta.total).toBe(1);
    });

    it('desactiva la asignación sin borrar su historial', async () => {
      prisma.usuario.findUnique.mockResolvedValue(operario);
      prisma.galpon.findUnique.mockResolvedValue(galpon);
      prisma.usuarioGalpon.findUnique.mockResolvedValue({
        id: 40,
        activa: true,
      });
      prisma.usuarioGalpon.update.mockResolvedValue({ id: 40, activa: false });

      await expect(
        service.desasignarGalpon(20, 30, propietario),
      ).resolves.toEqual({ usuario_id: 20, galpon_id: 30, activa: false });
      expect(prisma.usuarioGalpon.update).toHaveBeenCalledWith({
        where: { id: 40 },
        data: { activa: false },
      });
    });

    it('responde 404 si la asignación ya estaba inactiva', async () => {
      prisma.usuario.findUnique.mockResolvedValue(operario);
      prisma.galpon.findUnique.mockResolvedValue(galpon);
      prisma.usuarioGalpon.findUnique.mockResolvedValue({
        id: 40,
        activa: false,
      });

      await expect(
        service.desasignarGalpon(20, 30, propietario),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.usuarioGalpon.update).not.toHaveBeenCalled();
    });
  });

  describe('borrado', () => {
    it('no puedes desactivar tu propia cuenta (403)', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        id: 1,
        rol: { nombre: 'Administrador' },
      });

      await expect(service.desactivar(1, admin)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('no puedes eliminarte a ti mismo de forma permanente (403)', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        id: 1,
        rol: { nombre: 'Administrador' },
      });

      await expect(service.eliminarPermanente(1, admin)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    describe('desactivación y eliminación con bloqueos ordenados', () => {
      const operarioDe10 = {
        id: 20,
        organizacion_id: 10,
        email: 'op@x.com',
        cedula: '123',
        rol: { nombre: 'Operario' },
      };
      const orden = (mock: jest.Mock, llamada = 0) =>
        mock.mock.invocationCallOrder[llamada];
      const sql = (llamada: number) =>
        (
          prisma.$queryRaw.mock.calls[llamada] as [TemplateStringsArray]
        )[0].join('?');
      const errorDriver = (codigo: string) => {
        const e = new Error('error del driver');
        e.name = 'DriverAdapterError';
        (e as Error & { cause: unknown }).cause = { originalCode: codigo };
        return e;
      };

      beforeEach(() => {
        prisma.usuario.findUnique.mockResolvedValue(operarioDe10);
        prisma.usuario.update.mockResolvedValue({ id: 20, activo: false });
        prisma.sesion.updateMany.mockResolvedValue({ count: 1 });
        prisma.usuarioGalpon.updateMany.mockResolvedValue({ count: 2 });
        prisma.usuarioGalpon.deleteMany.mockResolvedValue({ count: 2 });
        prisma.sesion.deleteMany.mockResolvedValue({ count: 1 });
        prisma.seguridadCuenta.deleteMany.mockResolvedValue({ count: 1 });
        prisma.usuario.delete.mockResolvedValue({ id: 20 });
      });

      it.each([
        ['DELETE', () => service.desactivar(20, propietario)],
        [
          'PATCH activo:false',
          () => service.actualizar(20, { activo: false }, propietario),
        ],
      ])(
        '%s: usuario primero, luego sesiones y asignaciones por id, en una transacción READ COMMITTED con espera máxima',
        async (_nombre, accion) => {
          await accion();

          expect(prisma.$transaction).toHaveBeenCalledTimes(1);
          expect(prisma.$transaction).toHaveBeenCalledWith(
            expect.any(Function),
            { isolationLevel: 'ReadCommitted', timeout: 10000 },
          );
          expect(
            String(
              (prisma.$executeRaw.mock.calls[0] as [TemplateStringsArray])[0],
            ),
          ).toContain("lock_timeout = '5000ms'");
          expect(sql(0)).toContain('"sesiones"');
          expect(sql(0)).toContain('ORDER BY "id" FOR UPDATE');
          expect(sql(1)).toContain('"usuarios_galpones"');
          expect(sql(1)).toContain('ORDER BY "id" FOR UPDATE');
          expect(prisma.sesion.updateMany).toHaveBeenCalledWith({
            where: { id: { in: [40, 41] } },
            data: { revocada: true },
          });
          expect(prisma.usuarioGalpon.updateMany).toHaveBeenCalledWith({
            where: { id: { in: [40, 41] } },
            data: { activa: false },
          });
          expect(orden(prisma.$executeRaw)).toBeLessThan(
            orden(prisma.usuario.update),
          );
          expect(orden(prisma.usuario.update)).toBeLessThan(
            orden(prisma.$queryRaw, 0),
          );
          expect(orden(prisma.$queryRaw, 0)).toBeLessThan(
            orden(prisma.sesion.updateMany),
          );
          expect(orden(prisma.sesion.updateMany)).toBeLessThan(
            orden(prisma.$queryRaw, 1),
          );
          expect(orden(prisma.$queryRaw, 1)).toBeLessThan(
            orden(prisma.usuarioGalpon.updateMany),
          );
        },
      );

      it('no escribe sobre filas que no bloqueó ni cuando no había ninguna', async () => {
        prisma.$queryRaw.mockResolvedValue([]);

        await service.desactivar(20, propietario);

        expect(prisma.sesion.updateMany).not.toHaveBeenCalled();
        expect(prisma.usuarioGalpon.updateMany).not.toHaveBeenCalled();
        expect(prisma.usuario.update).toHaveBeenCalledTimes(1);
      });

      it('PATCH activo:false conserva los demás campos y devuelve el usuario actualizado', async () => {
        prisma.usuario.update.mockResolvedValue({
          id: 20,
          nombre_completo: 'Nuevo nombre',
          activo: false,
        });

        const res = await service.actualizar(
          20,
          { activo: false, nombre_completo: 'Nuevo nombre' },
          propietario,
        );

        expect(dataDe(prisma.usuario.update)).toMatchObject({
          activo: false,
          nombre_completo: 'Nuevo nombre',
        });
        expect(res).toEqual({
          id: 20,
          nombre_completo: 'Nuevo nombre',
          activo: false,
        });
      });

      it.each([
        ['sin activo', { nombre_completo: 'x' }],
        ['con activo:true', { activo: true }],
      ])(
        'PATCH %s no abre transacción ni toca sesiones ni asignaciones',
        async (_nombre, dto) => {
          await service.actualizar(20, dto, propietario);

          expect(prisma.$transaction).not.toHaveBeenCalled();
          expect(prisma.sesion.updateMany).not.toHaveBeenCalled();
          expect(prisma.usuarioGalpon.updateMany).not.toHaveBeenCalled();
          expect(prisma.usuario.update).toHaveBeenCalledTimes(1);
        },
      );

      it('PATCH activo:false sobre la propia cuenta es 403 y no escribe nada', async () => {
        prisma.usuario.findUnique.mockResolvedValue({
          id: 1,
          email: 'a@x.com',
          cedula: '1',
          rol: { nombre: 'Administrador' },
        });

        await expect(
          service.actualizar(1, { activo: false }, admin),
        ).rejects.toThrow('No puedes desactivar tu propia cuenta');
        expect(prisma.$transaction).not.toHaveBeenCalled();
        expect(prisma.usuario.update).not.toHaveBeenCalled();
      });

      it('la eliminación permanente bloquea al usuario antes de borrar sesiones, seguridad y asignaciones por id', async () => {
        await service.eliminarPermanente(20, admin);

        expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
          isolationLevel: 'ReadCommitted',
          timeout: 10000,
        });
        const [plantilla, id] = prisma.$queryRaw.mock.calls[0] as [
          TemplateStringsArray,
          number,
        ];
        expect(plantilla.join('?')).toContain('"usuarios"');
        expect(plantilla.join('?')).toContain('FOR UPDATE');
        expect(id).toBe(20);
        expect(prisma.sesion.deleteMany).toHaveBeenCalledWith({
          where: { id: { in: [40, 41] } },
        });
        expect(prisma.usuarioGalpon.deleteMany).toHaveBeenCalledWith({
          where: { id: { in: [40, 41] } },
        });
        expect(orden(prisma.$queryRaw, 0)).toBeLessThan(
          orden(prisma.sesion.deleteMany),
        );
        expect(orden(prisma.sesion.deleteMany)).toBeLessThan(
          orden(prisma.usuarioGalpon.deleteMany),
        );
        expect(orden(prisma.usuarioGalpon.deleteMany)).toBeLessThan(
          orden(prisma.usuario.delete),
        );
      });

      it.each([
        ['DELETE', () => service.desactivar(20, propietario)],
        [
          'PATCH activo:false',
          () => service.actualizar(20, { activo: false }, propietario),
        ],
        ['DELETE permanente', () => service.eliminarPermanente(20, admin)],
      ])('%s traduce solo 55P03 a 409', async (_nombre, accion) => {
        prisma.$transaction.mockRejectedValueOnce(errorDriver('55P03'));
        await expect(accion()).rejects.toBeInstanceOf(ConflictException);

        prisma.$transaction.mockRejectedValueOnce(errorDriver('55P03'));
        await expect(accion()).rejects.toThrow(
          'El usuario está siendo modificado por otra operación; intenta de nuevo',
        );

        const deadlock = errorDriver('40P01');
        prisma.$transaction.mockRejectedValueOnce(deadlock);
        await expect(accion()).rejects.toBe(deadlock);

        const vencida = Object.assign(new Error('expired'), { code: 'P2028' });
        prisma.$transaction.mockRejectedValueOnce(vencida);
        await expect(accion()).rejects.toBe(vencida);
      });
    });
  });
});
