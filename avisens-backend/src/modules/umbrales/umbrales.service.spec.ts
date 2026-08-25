import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UmbralesService } from './umbrales.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('UmbralesService', () => {
  let service: UmbralesService;

  const prisma = {
    galpon: { findUnique: jest.fn() },
    umbralAmbiental: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const admin = { id: 1, rol: 'Administrador' };
  const propietario = { id: 5, rol: 'Propietario' };

  const dtoCrear = {
    galpon_id: 1,
    variable: 'temperatura',
    semana_vida: 1,
    valor_minimo: 30,
    valor_maximo: 33,
    unidad: '°C',
    criticidad: 'alta',
  };

  const umbralVigente = {
    id: 10,
    galpon_id: 1,
    variable: 'temperatura',
    semana_vida: 1,
    valor_minimo: 30,
    valor_maximo: 33,
    unidad: '°C',
    criticidad: 'alta',
    version: 1,
    vigente: true,
    galpon: { id: 1, nombre: 'G1', granja: { id: 1, propietario_id: 5 } },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UmbralesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<UmbralesService>(UmbralesService);

    prisma.galpon.findUnique.mockResolvedValue({
      id: 1,
      granja: { propietario_id: 5 },
    });
    // listar le pasa un array a $transaction; revisar le pasa una funcion.
    // Este es el comportamiento por defecto (array); las pruebas de revisar
    // sobrescriben el mock con la forma de callback.
    prisma.$transaction.mockResolvedValue([[], 0]);
  });

  const paginacion = { page: 1, limit: 10 };

  const whereDeListar = () => {
    const [args] = prisma.umbralAmbiental.findMany.mock.calls[0] as [
      { where: Record<string, unknown> },
    ];
    return args.where;
  };

  afterEach(() => jest.clearAllMocks());

  describe('crear', () => {
    it('rechaza (409) si ya existe un umbral vigente para galpón+variable+semana', async () => {
      prisma.umbralAmbiental.findFirst.mockResolvedValue({ id: 10 });

      await expect(service.crear(dtoCrear, admin)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.umbralAmbiental.create).not.toHaveBeenCalled();
    });

    it('crea la versión 1 si no hay uno vigente', async () => {
      prisma.umbralAmbiental.findFirst.mockResolvedValue(null);
      prisma.umbralAmbiental.create.mockResolvedValue({ id: 1 });

      await service.crear(dtoCrear, admin);
      expect(prisma.umbralAmbiental.create).toHaveBeenCalled();
    });

    it('un Propietario de otra granja recibe 403', async () => {
      prisma.galpon.findUnique.mockResolvedValue({
        id: 1,
        granja: { propietario_id: 999 },
      });

      await expect(service.crear(dtoCrear, propietario)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('revisar', () => {
    it('jubila el vigente y crea la versión siguiente en una transacción', async () => {
      prisma.umbralAmbiental.findUnique.mockResolvedValue(umbralVigente);

      prisma.$transaction.mockImplementation(
        (cb: (tx: typeof prisma) => unknown) => cb(prisma),
      );
      prisma.umbralAmbiental.update.mockResolvedValue({});
      prisma.umbralAmbiental.create.mockResolvedValue({ id: 11 });

      await service.revisar(10, { valor_maximo: 35 }, admin);

      expect(prisma.umbralAmbiental.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 10 },
          data: { vigente: false },
        }),
      );

      const calls = prisma.umbralAmbiental.create.mock.calls as Array<
        [{ data: Record<string, unknown> }]
      >;
      expect(calls[0][0].data).toMatchObject({
        version: 2,
        vigente: true,
        valor_maximo: 35,
        valor_minimo: 30,
      });
    });

    it('rechaza (400) si el umbral ya no está vigente', async () => {
      prisma.umbralAmbiental.findUnique.mockResolvedValue({
        ...umbralVigente,
        vigente: false,
      });

      await expect(
        service.revisar(10, { valor_maximo: 35 }, admin),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('listar', () => {
    it('por defecto solo devuelve los vigentes', async () => {
      await service.listar(paginacion, admin);

      expect(whereDeListar()).toEqual({
        galpon_id: undefined,
        variable: undefined,
        vigente: true,
        galpon: undefined,
      });
    });

    it('con incluir_historico quita el filtro de vigencia', async () => {
      await service.listar(
        { ...paginacion, incluir_historico: true },
        admin,
      );

      // En Prisma, `undefined` ELIMINA el filtro; no busca nulos. Por eso
      // vigente tiene que quedar en undefined y no en false: con false solo
      // saldria el historico, y lo que se pide es historico + vigentes.
      expect(whereDeListar().vigente).toBeUndefined();
    });

    it('traslada galpon_id y variable al filtro', async () => {
      await service.listar(
        { ...paginacion, galpon_id: 3, variable: 'humedad' },
        admin,
      );

      const where = whereDeListar();
      expect(where.galpon_id).toBe(3);
      expect(where.variable).toBe('humedad');
    });

    it('el administrador ve los umbrales de todas las granjas', async () => {
      await service.listar(paginacion, admin);
      expect(whereDeListar().galpon).toBeUndefined();
    });

    it('el propietario solo ve los de sus galpones, tambien al contar', async () => {
      await service.listar(paginacion, propietario);

      const esperado = {
        galpon_id: undefined,
        variable: undefined,
        vigente: true,
        galpon: { granja: { propietario_id: propietario.id } },
      };
      expect(whereDeListar()).toEqual(esperado);
      expect(prisma.umbralAmbiental.count).toHaveBeenCalledWith({
        where: esperado,
      });
    });
  });

  describe('jubilar', () => {
    it('marca como no vigente el umbral vigente', async () => {
      prisma.umbralAmbiental.findUnique.mockResolvedValue(umbralVigente);
      prisma.umbralAmbiental.update.mockResolvedValue({ id: 10 });

      const r = await service.jubilar(10, propietario);

      expect(r).toEqual({ id: 10, vigente: false });
      expect(prisma.umbralAmbiental.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { vigente: false },
      });
    });

    it('rechaza (400) jubilar dos veces, sin volver a escribir', async () => {
      prisma.umbralAmbiental.findUnique.mockResolvedValue({
        ...umbralVigente,
        vigente: false,
      });

      await expect(service.jubilar(10, propietario)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.umbralAmbiental.update).not.toHaveBeenCalled();
    });

    it('un propietario no puede jubilar el umbral de otra granja', async () => {
      prisma.umbralAmbiental.findUnique.mockResolvedValue({
        ...umbralVigente,
        galpon: { id: 1, nombre: 'G1', granja: { id: 1, propietario_id: 999 } },
      });

      await expect(service.jubilar(10, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.umbralAmbiental.update).not.toHaveBeenCalled();
    });
  });

  describe('obtener', () => {
    it('lanza NotFound cuando el umbral no existe', async () => {
      prisma.umbralAmbiental.findUnique.mockResolvedValue(null);

      await expect(service.obtener(99, admin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('devuelve el umbral propio', async () => {
      prisma.umbralAmbiental.findUnique.mockResolvedValue(umbralVigente);

      const r = await service.obtener(10, propietario);

      expect(r.id).toBe(10);
    });
  });

  describe('validarGalpon', () => {
    it('lanza NotFound al crear sobre un galpon que no existe', async () => {
      prisma.galpon.findUnique.mockResolvedValue(null);

      await expect(service.crear(dtoCrear, admin)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.umbralAmbiental.create).not.toHaveBeenCalled();
    });
  });
});
