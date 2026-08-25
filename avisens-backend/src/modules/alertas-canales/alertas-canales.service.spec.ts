import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AlertasCanalesService } from './alertas-canales.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES } from '../../common/auth/roles';
import type { Solicitante } from '../../common/auth/acceso';
import { CreateAlertasCanalesDto } from './dto/create-alertas-canales.dto';
import { UpdateAlertasCanalesDto } from './dto/update-alertas-canales.dto';

describe('AlertasCanalesService', () => {
  let service: AlertasCanalesService;

  const prisma = {
    alertaCanal: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    alerta: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const admin: Solicitante = { id: 1, rol: ROLES.ADMINISTRADOR };
  const propietario: Solicitante = { id: 5, rol: ROLES.PROPIETARIO };

  const canalDelPropietario = {
    id: 1,
    alerta_id: 1,
    canal: 'sms',
    estado_envio: 'pendiente',
    fecha_envio: null,
    alerta: { galpon: { granja: { propietario_id: 5 } } },
  };

  const canalAjeno = {
    id: 1,
    alerta: { galpon: { granja: { propietario_id: 999 } } },
  };

  const dtoCrear: CreateAlertasCanalesDto = {
    alerta_id: 1,
    canal: 'sms',
    estado_envio: 'pendiente',
  };

  const argDe = (mock: jest.Mock): Record<string, unknown> => {
    const calls = mock.mock.calls as Array<[Record<string, unknown>]>;
    return calls[0]?.[0] ?? {};
  };

  const dataDe = (mock: jest.Mock): Record<string, unknown> =>
    (argDe(mock).data as Record<string, unknown>) ?? {};

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertasCanalesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AlertasCanalesService>(AlertasCanalesService);

    prisma.$transaction.mockResolvedValue([[], 0]);
    prisma.alerta.findUnique.mockResolvedValue({
      id: 1,
      galpon: { granja: { propietario_id: 5 } },
    });
    prisma.alertaCanal.findUnique.mockResolvedValue(canalDelPropietario);
    prisma.alertaCanal.findFirst.mockResolvedValue(null);
  });

  afterEach(() => jest.clearAllMocks());

  describe('crear', () => {
    it('crea un canal cuando la alerta es del propietario', async () => {
      const esperado = { id: 1, ...dtoCrear };
      prisma.alertaCanal.create.mockResolvedValue(esperado);

      const result = await service.crear(dtoCrear, propietario);

      expect(dataDe(prisma.alertaCanal.create)).toMatchObject({
        alerta_id: 1,
        canal: 'sms',
        estado_envio: 'pendiente',
      });
      expect(result).toEqual(esperado);
    });

    it('usa "pendiente" como estado por defecto si no se envia', async () => {
      const dtoSinEstado: CreateAlertasCanalesDto = {
        alerta_id: 1,
        canal: 'email',
      };
      prisma.alertaCanal.create.mockResolvedValue({ id: 1 });

      await service.crear(dtoSinEstado, propietario);

      expect(dataDe(prisma.alertaCanal.create)).toMatchObject({
        estado_envio: 'pendiente',
      });
    });

    it('rechaza (403) si la alerta no es del propietario', async () => {
      prisma.alerta.findUnique.mockResolvedValue({
        id: 1,
        galpon: { granja: { propietario_id: 999 } },
      });

      await expect(service.crear(dtoCrear, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.alertaCanal.create).not.toHaveBeenCalled();
    });

    it('rechaza (404) si la alerta no existe', async () => {
      prisma.alerta.findUnique.mockResolvedValue(null);

      await expect(service.crear(dtoCrear, admin)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.alertaCanal.create).not.toHaveBeenCalled();
    });

    it('rechaza (403) si ya existe un canal duplicado', async () => {
      prisma.alertaCanal.findFirst.mockResolvedValue({ id: 2 });

      await expect(service.crear(dtoCrear, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.alertaCanal.create).not.toHaveBeenCalled();
    });
  });

  describe('listar', () => {
    it('lista solo los canales de sus alertas si es Propietario', async () => {
      await service.listar(propietario, { page: 1, limit: 10 });

      expect(argDe(prisma.alertaCanal.findMany).where).toEqual({
        alerta: { galpon: { granja: { propietario_id: 5 } } },
      });
    });

    it('lista todos los canales si es Admin', async () => {
      await service.listar(admin, { page: 1, limit: 10 });

      expect(argDe(prisma.alertaCanal.findMany).where).toEqual({});
    });

    it('usa $transaction para la consistencia', async () => {
      await service.listar(admin, { page: 1, limit: 10 });
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('pagina correctamente', async () => {
      await service.listar(admin, { page: 2, limit: 5 });

      expect(argDe(prisma.alertaCanal.findMany)).toMatchObject({
        skip: 5,
        take: 5,
      });
    });
  });

  describe('obtener', () => {
    it('obtiene un canal por ID', async () => {
      const result = await service.obtener(1, propietario);

      expect(result).toBeDefined();
      expect(argDe(prisma.alertaCanal.findUnique).where).toEqual({ id: 1 });
    });

    it('rechaza (404) si el canal no existe', async () => {
      prisma.alertaCanal.findUnique.mockResolvedValue(null);

      await expect(service.obtener(1, admin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rechaza (403) si el canal es de una alerta ajena', async () => {
      prisma.alertaCanal.findUnique.mockResolvedValue(canalAjeno);

      await expect(service.obtener(1, propietario)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('permite a Admin ver cualquier canal', async () => {
      prisma.alertaCanal.findUnique.mockResolvedValue(canalAjeno);

      const result = await service.obtener(1, admin);
      expect(result).toBeDefined();
    });
  });

  describe('actualizar', () => {
    it('actualiza un canal', async () => {
      const dto: UpdateAlertasCanalesDto = { estado_envio: 'enviado' };
      prisma.alertaCanal.update.mockResolvedValue({ id: 1, ...dto });

      const result = await service.actualizar(1, dto, propietario);

      expect(argDe(prisma.alertaCanal.update).where).toEqual({ id: 1 });
      expect(dataDe(prisma.alertaCanal.update)).toMatchObject({
        estado_envio: 'enviado',
      });
      expect(result).toBeDefined();
    });

    it('convierte fecha_envio a Date si se envia', async () => {
      const dto: UpdateAlertasCanalesDto = {
        fecha_envio: '2024-01-15T12:00:00Z',
      };
      prisma.alertaCanal.update.mockResolvedValue({ id: 1 });

      await service.actualizar(1, dto, propietario);

      expect(dataDe(prisma.alertaCanal.update).fecha_envio).toBeInstanceOf(
        Date,
      );
    });

    it('permite establecer fecha_envio como null', async () => {
      const dto = { fecha_envio: null } as unknown as UpdateAlertasCanalesDto;
      prisma.alertaCanal.update.mockResolvedValue({ id: 1 });

      await service.actualizar(1, dto, propietario);

      expect(dataDe(prisma.alertaCanal.update).fecha_envio).toBeNull();
    });

    it('retorna el registro actual si no hay datos para actualizar', async () => {
      prisma.alertaCanal.findUnique.mockResolvedValue(canalDelPropietario);

      const result = await service.actualizar(1, {}, propietario);

      expect(result).toEqual(canalDelPropietario);
      expect(prisma.alertaCanal.update).not.toHaveBeenCalled();
    });

    it('rechaza (403) si el canal es de una alerta ajena', async () => {
      prisma.alertaCanal.findUnique.mockResolvedValue(canalAjeno);

      await expect(
        service.actualizar(1, { estado_envio: 'enviado' }, propietario),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.alertaCanal.update).not.toHaveBeenCalled();
    });
  });

  describe('marcarComoEnviado', () => {
    it('marca como enviado cuando es dueno', async () => {
      prisma.alertaCanal.update.mockResolvedValue({
        id: 1,
        estado_envio: 'enviado',
        fecha_envio: new Date(),
      });

      const result = await service.marcarComoEnviado(1, propietario);

      expect(result).toBeDefined();
      expect(argDe(prisma.alertaCanal.update).where).toEqual({ id: 1 });
      const data = dataDe(prisma.alertaCanal.update);
      expect(data.estado_envio).toBe('enviado');
      expect(data.fecha_envio).toBeInstanceOf(Date);
    });

    it('rechaza (403) si el canal es de una alerta ajena', async () => {
      prisma.alertaCanal.findUnique.mockResolvedValue(canalAjeno);

      await expect(service.marcarComoEnviado(1, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.alertaCanal.update).not.toHaveBeenCalled();
    });
  });

  describe('marcarComoFallido', () => {
    it('marca como fallido cuando es dueno', async () => {
      prisma.alertaCanal.update.mockResolvedValue({
        id: 1,
        estado_envio: 'fallido',
      });

      const result = await service.marcarComoFallido(1, propietario);

      expect(result).toBeDefined();
      expect(argDe(prisma.alertaCanal.update).where).toEqual({ id: 1 });
      expect(dataDe(prisma.alertaCanal.update)).toMatchObject({
        estado_envio: 'fallido',
      });
    });

    it('rechaza (403) si el canal es de una alerta ajena', async () => {
      prisma.alertaCanal.findUnique.mockResolvedValue(canalAjeno);

      await expect(service.marcarComoFallido(1, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.alertaCanal.update).not.toHaveBeenCalled();
    });
  });

  describe('actualizarEstadoEnvio', () => {
    it('actualiza el estado a "en_proceso"', async () => {
      prisma.alertaCanal.update.mockResolvedValue({
        id: 1,
        estado_envio: 'en_proceso',
      });

      await service.actualizarEstadoEnvio(1, 'en_proceso', propietario);

      expect(dataDe(prisma.alertaCanal.update)).toMatchObject({
        estado_envio: 'en_proceso',
      });
    });

    it('establece fecha_envio cuando el estado es "enviado"', async () => {
      prisma.alertaCanal.update.mockResolvedValue({
        id: 1,
        estado_envio: 'enviado',
        fecha_envio: new Date(),
      });

      await service.actualizarEstadoEnvio(1, 'enviado', propietario);

      const data = dataDe(prisma.alertaCanal.update);
      expect(data.estado_envio).toBe('enviado');
      expect(data.fecha_envio).toBeInstanceOf(Date);
    });

    it('NO establece fecha_envio cuando el estado no es "enviado"', async () => {
      prisma.alertaCanal.update.mockResolvedValue({
        id: 1,
        estado_envio: 'fallido',
      });

      await service.actualizarEstadoEnvio(1, 'fallido', propietario);

      expect(dataDe(prisma.alertaCanal.update)).not.toHaveProperty(
        'fecha_envio',
      );
    });
  });

  describe('obtenerPorAlerta', () => {
    it('obtiene todos los canales de una alerta', async () => {
      const data = [
        { id: 1, alerta_id: 1, canal: 'sms' },
        { id: 2, alerta_id: 1, canal: 'email' },
      ];
      prisma.$transaction.mockResolvedValue([data, 2]);

      const result = await service.obtenerPorAlerta(1, propietario, {
        page: 1,
        limit: 10,
      });

      expect(result.data).toEqual(data);
      expect(result.meta.total).toBe(2);
      expect(argDe(prisma.alertaCanal.findMany).where).toEqual({
        alerta_id: 1,
      });
    });

    it('rechaza (403) si la alerta no es del propietario', async () => {
      prisma.alerta.findUnique.mockResolvedValue({
        id: 1,
        galpon: { granja: { propietario_id: 999 } },
      });

      await expect(
        service.obtenerPorAlerta(1, propietario, { page: 1, limit: 10 }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.alertaCanal.findMany).not.toHaveBeenCalled();
    });
  });

  describe('eliminar', () => {
    it('elimina un canal cuando es dueno', async () => {
      prisma.alertaCanal.delete.mockResolvedValue({ id: 1 });

      const result = await service.eliminar(1, propietario);

      expect(result).toEqual({ id: 1, eliminado: true });
      expect(prisma.alertaCanal.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('rechaza (403) si el canal es de una alerta ajena', async () => {
      prisma.alertaCanal.findUnique.mockResolvedValue(canalAjeno);

      await expect(service.eliminar(1, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.alertaCanal.delete).not.toHaveBeenCalled();
    });
  });

  describe('eliminarPorAlerta', () => {
    it('elimina todos los canales de una alerta', async () => {
      prisma.alertaCanal.deleteMany.mockResolvedValue({ count: 3 });

      const result = await service.eliminarPorAlerta(1, propietario);

      expect(result).toEqual({ alerta_id: 1, eliminados: 3 });
      expect(prisma.alertaCanal.deleteMany).toHaveBeenCalledWith({
        where: { alerta_id: 1 },
      });
    });

    it('rechaza (403) si la alerta no es del propietario', async () => {
      prisma.alerta.findUnique.mockResolvedValue({
        id: 1,
        galpon: { granja: { propietario_id: 999 } },
      });

      await expect(service.eliminarPorAlerta(1, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.alertaCanal.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('obtenerEstadisticas', () => {
    it('calcula estadisticas para Propietario', async () => {
      prisma.alertaCanal.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(6)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(2);

      const stats = await service.obtenerEstadisticas(propietario);

      expect(stats).toEqual({
        total: 10,
        enviados: 6,
        pendientes: 2,
        fallidos: 2,
        tasa_exito: 60,
      });
    });

    it('calcula estadisticas para Admin', async () => {
      prisma.alertaCanal.count
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(15)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(2);

      const stats = await service.obtenerEstadisticas(admin);

      expect(stats).toEqual({
        total: 20,
        enviados: 15,
        pendientes: 3,
        fallidos: 2,
        tasa_exito: 75,
      });
    });

    it('devuelve tasa_exito = 0 cuando no hay total', async () => {
      prisma.alertaCanal.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const stats = await service.obtenerEstadisticas(admin);

      expect(stats).toEqual({
        total: 0,
        enviados: 0,
        pendientes: 0,
        fallidos: 0,
        tasa_exito: 0,
      });
    });
  });
});
