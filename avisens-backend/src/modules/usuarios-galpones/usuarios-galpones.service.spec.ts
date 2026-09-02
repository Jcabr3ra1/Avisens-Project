import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ROLES } from '../../common/auth/roles';
import { PrismaService } from '../../prisma/prisma.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { UsuariosGalponesService } from './usuarios-galpones.service';

describe('UsuariosGalponesService', () => {
  let service: UsuariosGalponesService;
  const prisma = {
    usuarioGalpon: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const usuariosService = {
    asignarGalpon: jest.fn(),
    desasignarGalpon: jest.fn(),
  };
  const propietario = { id: 7, rol: ROLES.PROPIETARIO };
  const operario = { id: 9, rol: ROLES.OPERARIO, organizacion_id: 4 };
  const administrador = { id: 1, rol: ROLES.ADMINISTRADOR };

  const whereDe = (mock: jest.Mock): Record<string, unknown> => {
    const llamadas = mock.mock.calls as unknown as Array<
      [{ where: Record<string, unknown> }]
    >;
    return llamadas[0][0].where;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosGalponesService,
        { provide: PrismaService, useValue: prisma },
        { provide: UsuariosService, useValue: usuariosService },
      ],
    }).compile();
    service = module.get(UsuariosGalponesService);
    prisma.$transaction.mockResolvedValue([[], 0]);
  });

  it('delega la asignación a la lógica multi-tenant de usuarios', async () => {
    usuariosService.asignarGalpon.mockResolvedValue({ id: 1 });
    await service.crear(
      { usuario_id: 2, galpon_id: 3, rol_asignacion: 'galponero' },
      propietario,
    );
    expect(usuariosService.asignarGalpon).toHaveBeenCalledWith(
      2,
      3,
      'galponero',
      propietario,
    );
  });

  it('pagina y limita las asignaciones del propietario', async () => {
    await service.listar({ page: 1, limit: 20 }, propietario);
    const llamadas = prisma.usuarioGalpon.findMany.mock
      .calls as unknown as Array<[{ where: Record<string, unknown> }]>;
    const argumentos = llamadas[0][0];
    expect(argumentos.where).toMatchObject({
      galpon: { granja: { propietario_id: propietario.id } },
    });
  });

  it('lanza NotFound para una asignación no accesible', async () => {
    prisma.usuarioGalpon.findFirst.mockResolvedValue(null);
    await expect(service.obtener(99, propietario)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('desactiva sin borrar la asignación', async () => {
    const asignacion = {
      id: 1,
      usuario_id: 2,
      galpon_id: 3,
      rol_asignacion: 'galponero',
    };
    prisma.usuarioGalpon.findFirst
      .mockResolvedValueOnce(asignacion)
      .mockResolvedValueOnce({ ...asignacion, activa: false });
    usuariosService.desasignarGalpon.mockResolvedValue({ activa: false });
    await expect(service.desactivar(1, propietario)).resolves.toMatchObject({
      activa: false,
    });
    expect(usuariosService.desasignarGalpon).toHaveBeenCalledWith(
      2,
      3,
      propietario,
    );
  });

  // La ruta se abrio al operario para que vea quien mas trabaja en su
  // galpon. El filtro viejo comparaba contra granja.propietario_id, que su
  // id nunca cumple: habria entrado a una lista vacia.
  describe('alcance del operario', () => {
    it('ve las asignaciones de los galpones donde trabaja', async () => {
      await service.listar({ page: 1, limit: 20 }, operario);

      expect(whereDe(prisma.usuarioGalpon.findMany)).toMatchObject({
        galpon: {
          usuarios_galpones: {
            some: { usuario_id: operario.id, activa: true },
          },
        },
      });
    });

    it('no se le filtra por propietario_id', async () => {
      await service.listar({ page: 1, limit: 20 }, operario);

      expect(
        JSON.stringify(whereDe(prisma.usuarioGalpon.findMany)),
      ).not.toContain('propietario_id');
    });

    it('queda encerrado en su organización', async () => {
      await service.listar({ page: 1, limit: 20 }, operario);

      expect(whereDe(prisma.usuarioGalpon.findMany)).toMatchObject({
        galpon: { granja: { organizacion_id: operario.organizacion_id } },
      });
    });

    it('el mismo alcance aplica al obtener una suelta', async () => {
      prisma.usuarioGalpon.findFirst.mockResolvedValue({ id: 5 });

      await service.obtener(5, operario);

      expect(whereDe(prisma.usuarioGalpon.findFirst)).toMatchObject({
        id: 5,
        galpon: expect.any(Object) as unknown,
      });
    });
  });

  it('el administrador sigue viendo todas las asignaciones', async () => {
    await service.listar({ page: 1, limit: 20 }, administrador);

    expect(whereDe(prisma.usuarioGalpon.findMany)).not.toHaveProperty('galpon');
  });
});
