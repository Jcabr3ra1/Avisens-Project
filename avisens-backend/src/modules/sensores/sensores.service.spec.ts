import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { SensoresService } from './sensores.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('SensoresService', () => {
  let service: SensoresService;

  const prisma = {
    galpon: { findUnique: jest.fn() },
    dispositivo: { findUnique: jest.fn() },
    sensor: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    ordenActuador: { findFirst: jest.fn(), updateMany: jest.fn() },
    estadoActuador: { deleteMany: jest.fn() },
    $transaction: jest.fn(),
  };

  const admin = { id: 1, rol: 'Administrador' };
  const propietario = { id: 5, rol: 'Propietario' };

  const dtoCrear = {
    galpon_id: 1,
    dispositivo_id: 10,
    codigo: 'S-1',
    tipo: 'temperatura',
    unidad_medida: '°C',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SensoresService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<SensoresService>(SensoresService);

    prisma.galpon.findUnique.mockResolvedValue({
      id: 1,
      granja: { propietario_id: 5 },
    });
    prisma.dispositivo.findUnique.mockResolvedValue({ id: 10, galpon_id: 1 });
    prisma.$transaction.mockResolvedValue([[], 0]);
  });

  afterEach(() => jest.clearAllMocks());

  describe('crear', () => {
    it('crea el sensor cuando galpón y dispositivo son coherentes', async () => {
      prisma.sensor.create.mockResolvedValue({ id: 1 });

      await service.crear(dtoCrear, admin);

      expect(prisma.sensor.create).toHaveBeenCalled();
    });

    it('rechaza (400) si el dispositivo pertenece a otro galpón', async () => {
      prisma.dispositivo.findUnique.mockResolvedValue({ id: 10, galpon_id: 2 });

      await expect(service.crear(dtoCrear, admin)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.sensor.create).not.toHaveBeenCalled();
    });

    it('rechaza (404) si el galpón no existe', async () => {
      prisma.galpon.findUnique.mockResolvedValue(null);

      await expect(service.crear(dtoCrear, admin)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.sensor.create).not.toHaveBeenCalled();
    });

    it('rechaza (404) si el dispositivo no existe', async () => {
      prisma.dispositivo.findUnique.mockResolvedValue(null);

      await expect(service.crear(dtoCrear, admin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('un Propietario no puede crear en un galpón ajeno (403)', async () => {
      prisma.galpon.findUnique.mockResolvedValue({
        id: 1,
        granja: { propietario_id: 999 },
      });

      await expect(service.crear(dtoCrear, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.sensor.create).not.toHaveBeenCalled();
    });
  });

  describe('listar', () => {
    it('un Propietario solo ve sensores de sus granjas', async () => {
      await service.listar(propietario, { page: 1, limit: 10 });

      expect(prisma.sensor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            galpon: { granja: { propietario_id: 5 } },
            estado: { not: 'retirado' },
          },
        }),
      );
    });

    it('un Admin ve todos los sensores (sin filtro de dueño)', async () => {
      await service.listar(admin, { page: 1, limit: 10 });

      expect(prisma.sensor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { estado: { not: 'retirado' } } }),
      );
    });
  });

  describe('obtener', () => {
    it('rechaza (404) si el sensor no existe', async () => {
      prisma.sensor.findUnique.mockResolvedValue(null);

      await expect(service.obtener(1, admin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('un Propietario no puede ver un sensor ajeno (403)', async () => {
      prisma.sensor.findUnique.mockResolvedValue({
        id: 1,
        galpon: { id: 1, granja: { propietario_id: 999 } },
        dispositivo: { id: 10 },
      });

      await expect(service.obtener(1, propietario)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('actualizar', () => {
    it('impide trasladar un sensor a otro galpón', async () => {
      prisma.sensor.findUnique.mockResolvedValue({
        id: 1,
        galpon: { id: 1, granja: { propietario_id: 5 } },
        dispositivo: { id: 5 },
      });

      await expect(
        service.actualizar(1, { galpon_id: 2 }, admin),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.sensor.update).not.toHaveBeenCalled();
    });

    it('al mover solo el dispositivo, valida coherencia contra el galpón actual', async () => {
      prisma.sensor.findUnique.mockResolvedValue({
        id: 1,
        galpon: { id: 1, granja: { propietario_id: 5 } },
        dispositivo: { id: 5 },
      });
      prisma.dispositivo.findUnique.mockResolvedValue({ id: 9, galpon_id: 2 });

      await expect(
        service.actualizar(1, { dispositivo_id: 9 }, admin),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.sensor.update).not.toHaveBeenCalled();
    });
  });

  describe('retiro de sensores', () => {
    const sensorDe = (estado: string) => ({
      id: 7,
      estado,
      galpon: { id: 1, granja: { propietario_id: 5 } },
      dispositivo: { id: 10 },
    });

    it('borra de verdad un sensor que nunca tuvo lecturas ni alertas', async () => {
      prisma.sensor.findUnique.mockResolvedValue(sensorDe('inactivo'));
      prisma.sensor.findFirst.mockResolvedValue(null);

      const r = await service.eliminarPermanente(7, admin);

      expect(prisma.sensor.delete).toHaveBeenCalledWith({ where: { id: 7 } });
      expect(r).toEqual({ id: 7, eliminado: true, retirado: false });
    });

    it('retira y libera la conexión de un sensor con historial, sin borrarlo', async () => {
      prisma.sensor.findUnique.mockResolvedValue(sensorDe('inactivo'));
      prisma.sensor.findFirst.mockResolvedValue({ id: 7 });

      const r = await service.eliminarPermanente(7, admin);

      expect(prisma.sensor.delete).not.toHaveBeenCalled();
      expect(prisma.sensor.update).toHaveBeenCalledWith({
        where: { id: 7 },
        data: { estado: 'retirado', canal: null },
      });
      expect(r).toEqual({ id: 7, eliminado: false, retirado: true });
    });

    it('un sensor retirado no se puede activar, desactivar ni editar', async () => {
      prisma.sensor.findUnique.mockResolvedValue(sensorDe('retirado'));

      await expect(service.activar(7, admin)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.desactivar(7, admin)).rejects.toThrow(
        ConflictException,
      );
      await expect(
        service.actualizar(7, { modelo: 'DHT22' }, admin),
      ).rejects.toThrow(ConflictException);
      expect(prisma.sensor.update).not.toHaveBeenCalled();
    });

    it('no permite retirar por edición: solo con Eliminar', async () => {
      prisma.sensor.findUnique.mockResolvedValue(sensorDe('activo'));

      await expect(
        service.actualizar(7, { estado: 'retirado' }, admin),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('registrarReles', () => {
    const dto = { galpon_id: 1, dispositivo_id: 10 };
    const esp32 = (parcial: Record<string, unknown> = {}) => ({
      id: 10,
      galpon_id: 1,
      nombre: 'ESP32 galpón 1',
      codigo_topic: 'G1-ESP32-01',
      activo: true,
      retirado_en: null,
      ...parcial,
    });

    it('registra los cuatro canales y resume qué pasó', async () => {
      prisma.dispositivo.findUnique.mockResolvedValue(esp32());
      prisma.sensor.findFirst.mockResolvedValue(null);
      prisma.sensor.findMany.mockResolvedValue([]);
      prisma.sensor.create.mockImplementation(
        ({ data }: { data: { codigo: string } }) =>
          Promise.resolve({ id: 1, codigo: data.codigo, tipo: 'x', estado: 'activo' }),
      );

      const res = await service.registrarReles(dto, admin);

      expect(res).toMatchObject({
        galpon_id: 1,
        dispositivo: { id: 10, codigo_topic: 'G1-ESP32-01' },
        completo: true,
        resumen: { creados: 4, asociados: 0, existentes: 0, conflictos: 0 },
      });
      expect(res.canales.map((c) => c.canal)).toEqual([
        'rele:k1',
        'rele:k2',
        'rele:k3',
        'rele:k4',
      ]);
    });

    it('si ya están los cuatro, informa el registro completo sin crear nada', async () => {
      prisma.dispositivo.findUnique.mockResolvedValue(esp32());
      prisma.sensor.findFirst.mockResolvedValue({ id: 3, codigo: 'X', tipo: 'x', estado: 'activo' });

      const res = await service.registrarReles(dto, admin);

      expect(res.completo).toBe(true);
      expect(res.resumen).toEqual({ creados: 0, asociados: 0, existentes: 4, conflictos: 0 });
      expect(prisma.sensor.create).not.toHaveBeenCalled();
    });

    it('rechaza (400) un ESP32 que no pertenece al galpón elegido, sin tocar sensores', async () => {
      prisma.dispositivo.findUnique.mockResolvedValue(esp32({ galpon_id: 2 }));
      await expect(service.registrarReles(dto, admin)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.sensor.create).not.toHaveBeenCalled();
      expect(prisma.sensor.updateMany).not.toHaveBeenCalled();
    });

    it('rechaza (404) un ESP32 inexistente', async () => {
      prisma.dispositivo.findUnique.mockResolvedValue(null);
      await expect(service.registrarReles(dto, admin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it.each([
      [{ activo: false }],
      [{ retirado_en: new Date() }],
    ])('rechaza (409) un ESP32 desactivado o retirado: %j', async (parcial) => {
      prisma.dispositivo.findUnique.mockResolvedValue(esp32(parcial));
      await expect(service.registrarReles(dto, admin)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.sensor.create).not.toHaveBeenCalled();
    });

    it('un Propietario no registra relés en un galpón ajeno (403)', async () => {
      prisma.galpon.findUnique.mockResolvedValue({ id: 1, granja: { propietario_id: 999 } });
      await expect(service.registrarReles(dto, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.dispositivo.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('edición de un relé (ficha del actuador)', () => {
    const rele = (parcial: Record<string, unknown> = {}) => ({
      id: 30,
      codigo: 'REL-K2-G1-D10',
      tipo: 'Ventiladores',
      canal: 'rele:k2',
      unidad_medida: 'estado',
      modelo: 'Relé K2',
      estado: 'activo',
      galpon: { id: 1, granja: { propietario_id: 5 } },
      dispositivo: { id: 10 },
      ...parcial,
    });

    beforeEach(() => {
      prisma.sensor.update.mockImplementation(() => Promise.resolve({ id: 30 }));
      prisma.$transaction.mockImplementation((ops: Promise<unknown>[]) =>
        Promise.all(ops),
      );
      prisma.ordenActuador.findFirst.mockResolvedValue(null);
    });

    it('edita los datos administrativos sin tocar la identidad física ni el estado reportado', async () => {
      prisma.sensor.findUnique.mockResolvedValue(rele());

      await service.actualizar(
        30,
        {
          tipo: '  Ventiladores túnel  ',
          modelo: 'SRD-05VDC',
          fabricante: 'Songle',
          fecha_instalacion: '2026-10-01',
          estado: 'mantenimiento',
        },
        admin,
      );

      const llamada = prisma.sensor.update.mock.calls[0] as [
        { data: Record<string, unknown> },
      ];
      // El nombre de un relé no se normaliza: conserva tildes y mayúsculas.
      expect(llamada[0].data).toMatchObject({
        tipo: 'Ventiladores túnel',
        modelo: 'SRD-05VDC',
        fabricante: 'Songle',
        estado: 'mantenimiento',
        canal: undefined,
        dispositivo_id: undefined,
      });
      expect(llamada[0].data.fecha_instalacion).toEqual(new Date('2026-10-01'));
      expect(prisma.estadoActuador.deleteMany).not.toHaveBeenCalled();
      expect(prisma.ordenActuador.findFirst).not.toHaveBeenCalled();
    });

    it('null borra la fecha de instalación', async () => {
      prisma.sensor.findUnique.mockResolvedValue(rele());
      await service.actualizar(30, { fecha_instalacion: null }, admin);
      const llamada = prisma.sensor.update.mock.calls[0] as [
        { data: Record<string, unknown> },
      ];
      expect(llamada[0].data.fecha_instalacion).toBeNull();
    });

    it('no deja vaciar el nombre', async () => {
      prisma.sensor.findUnique.mockResolvedValue(rele());
      await expect(service.actualizar(30, { tipo: '   ' }, admin)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rechaza cambiar la unidad de un relé: dejaría de ser controlable', async () => {
      prisma.sensor.findUnique.mockResolvedValue(rele());
      await expect(
        service.actualizar(30, { unidad_medida: '°C' }, admin),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.sensor.update).not.toHaveBeenCalled();
    });

    it('rechaza un canal de relé inválido', async () => {
      prisma.sensor.findUnique.mockResolvedValue(rele());
      await expect(
        service.actualizar(30, { canal: 'rele:k5' }, admin),
      ).rejects.toThrow(BadRequestException);
    });

    it('con una orden en curso no deja cambiar el canal: no se desvía su destino', async () => {
      prisma.sensor.findUnique.mockResolvedValue(rele());
      prisma.ordenActuador.findFirst.mockResolvedValue({ id: 77 });

      await expect(
        service.actualizar(30, { canal: 'rele:k3' }, admin),
      ).rejects.toThrow(ConflictException);
      expect(prisma.sensor.update).not.toHaveBeenCalled();
    });

    it('con una orden en curso no deja cambiar el código de un relé antiguo sin canal', async () => {
      prisma.sensor.findUnique.mockResolvedValue(
        rele({ codigo: 'REL-K2-G1-01', canal: null }),
      );
      prisma.ordenActuador.findFirst.mockResolvedValue({ id: 78 });

      await expect(
        service.actualizar(30, { codigo: 'REL-K2-G1-99' }, admin),
      ).rejects.toThrow(ConflictException);
    });

    it('al cambiar el canal descarta el estado informado del canal anterior y cierra órdenes que se colaran', async () => {
      prisma.sensor.findUnique.mockResolvedValue(rele());

      await service.actualizar(30, { canal: 'rele:k3' }, admin);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.estadoActuador.deleteMany).toHaveBeenCalledWith({
        where: { sensor_id: 30 },
      });
      const cierre = prisma.ordenActuador.updateMany.mock.calls[0] as [
        { where: Record<string, unknown>; data: Record<string, unknown> },
      ];
      expect(cierre[0].where).toEqual({
        sensor_id: 30,
        estado: { in: ['pendiente', 'enviada'] },
      });
      expect(cierre[0].data.estado).toBe('expirada');
    });

    it('un canal ocupado por otro relé del mismo ESP32 responde 409 nombrando el canal', async () => {
      prisma.sensor.findUnique.mockResolvedValue(rele());
      prisma.sensor.update.mockImplementation(() =>
        Promise.reject(
          Object.assign(new Error('Unique'), {
            code: 'P2002',
            meta: { target: 'sensores_rele_canal_unico' },
          }),
        ),
      );

      await expect(
        service.actualizar(30, { canal: 'rele:k1' }, admin),
      ).rejects.toThrow('canal K1');
    });

    it('al mover un relé a otro ESP32 valida que sea del mismo galpón', async () => {
      prisma.sensor.findUnique.mockResolvedValue(rele());
      prisma.dispositivo.findUnique.mockResolvedValue({ id: 11, galpon_id: 2 });

      await expect(
        service.actualizar(30, { dispositivo_id: 11 }, admin),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.sensor.update).not.toHaveBeenCalled();
    });

    it('un sensor que no reporta estado no puede tomar un canal de relé', async () => {
      prisma.sensor.findUnique.mockResolvedValue(
        rele({ codigo: 'TEMP-1', tipo: 'temperatura', canal: null, unidad_medida: '°C' }),
      );
      await expect(
        service.actualizar(30, { canal: 'rele:k1' }, admin),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
