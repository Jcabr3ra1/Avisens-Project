import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  EN_LINEA_SEGUNDOS,
  OrdenesActuadoresService,
  VIGENCIA_ORDEN_SEGUNDOS,
  esReleControlable,
} from './ordenes-actuadores.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('OrdenesActuadoresService', () => {
  let service: OrdenesActuadoresService;

  const prisma = {
    sensor: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() },
    galpon: { findUnique: jest.fn() },
    ordenActuador: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      updateMany: jest.fn(),
      groupBy: jest.fn(),
    },
    estadoActuador: { upsert: jest.fn(), findMany: jest.fn() },
    dispositivo: { findUnique: jest.fn(), update: jest.fn() },
  };

  const propietario = { id: 5, rol: 'Propietario', organizacion_id: 1 };
  const operario = { id: 8, rol: 'Operario', organizacion_id: 1 };

  // Relé K2 de un ESP32 que reportó hace un instante.
  const releK2 = (parcial: Record<string, unknown> = {}) => ({
    id: 12,
    codigo: 'REL-K2-G1-01',
    unidad_medida: 'estado',
    estado: 'activo',
    galpon_id: 3,
    dispositivo_id: 7,
    dispositivo: { activo: true, ultima_conexion: new Date() },
    galpon: { activo: true, granja: { propietario_id: 5 } },
    ...parcial,
  });

  type LlamadaUpdate = [
    { where: Record<string, unknown>; data: Record<string, unknown> },
  ];
  const updates = () => prisma.ordenActuador.updateMany.mock.calls as LlamadaUpdate[];

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdenesActuadoresService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(OrdenesActuadoresService);
    prisma.ordenActuador.updateMany.mockResolvedValue({ count: 0 });
    prisma.ordenActuador.findFirst.mockResolvedValue(null);
    prisma.sensor.findMany.mockResolvedValue([]);
    prisma.estadoActuador.findMany.mockResolvedValue([]);
  });

  describe('esReleControlable', () => {
    it('acepta solo los relés K1-K4 con unidad "estado"', () => {
      expect(esReleControlable({ codigo: 'REL-K1-G1-01', unidad_medida: 'estado' })).toBe(true);
      expect(esReleControlable({ codigo: 'REL-K4-G2-01', unidad_medida: 'Estado' })).toBe(true);
    });

    it('rechaza los motores (tienen su propia máquina de estados) y los sensores de medida', () => {
      expect(esReleControlable({ codigo: 'MOT-PERS-G1-01', unidad_medida: 'estado' })).toBe(false);
      expect(esReleControlable({ codigo: 'REL-K5-G1-01', unidad_medida: 'estado' })).toBe(false);
      expect(esReleControlable({ codigo: 'TEMP-G1-01', unidad_medida: '°C' })).toBe(false);
    });

    it('con canal manda el canal: el código deja de importar', () => {
      expect(
        esReleControlable({ codigo: 'ESTADO-G1-AB12', unidad_medida: 'estado', canal: 'rele:k3' }),
      ).toBe(true);
      // Un código REL-K con canal GPIO no es un relé: manda la conexión física.
      expect(
        esReleControlable({ codigo: 'REL-K1-G1-01', unidad_medida: 'estado', canal: 'gpio:18' }),
      ).toBe(false);
      expect(
        esReleControlable({ codigo: 'REL-K1-G1-01', unidad_medida: '°C', canal: 'rele:k1' }),
      ).toBe(false);
    });
  });

  describe('relés identificados por canal', () => {
    it('crea la orden para un relé registrado por canal aunque su código no sea REL-K', async () => {
      prisma.sensor.findUnique.mockResolvedValue(
        releK2({ codigo: 'SIN-PATRON-01', canal: 'rele:k2' }),
      );
      prisma.ordenActuador.create.mockResolvedValue({ id: 50 });
      await service.crear({ sensor_id: 12, accion: 'apagar' }, propietario);
      expect(prisma.ordenActuador.create).toHaveBeenCalled();
    });

    it('entrega el canal del relé además del código (compatibilidad con firmware anterior)', async () => {
      prisma.ordenActuador.findMany.mockResolvedValue([
        { id: 41, accion: 'encender', sensor: { codigo: 'REL-K2-G3-D7', canal: 'rele:k2' } },
        { id: 42, accion: 'apagar', sensor: { codigo: 'REL-K4-G1-01', canal: null } },
      ]);

      const res = await service.entregarPendientes(7, 'S');

      expect(res).toEqual([
        { id: 41, codigo: 'REL-K2-G3-D7', canal: 'rele:k2', accion: 'encender' },
        // Registro antiguo sin canal: solo el código; el firmware nuevo la
        // rechaza con motivo hasta que se registren los relés por canal.
        { id: 42, codigo: 'REL-K4-G1-01', accion: 'apagar' },
      ]);
    });

    it('solo entrega órdenes de relés que siguen en el ESP32 que consulta', async () => {
      prisma.ordenActuador.findMany.mockResolvedValue([]);
      await service.entregarPendientes(7, 'S');
      const consulta = prisma.ordenActuador.findMany.mock.calls[0] as [
        { where: Record<string, unknown> },
      ];
      expect(consulta[0].where).toMatchObject({
        dispositivo_id: 7,
        sensor: { dispositivo_id: 7 },
      });
    });

    it('recibe el estado por canal y lo resuelve dentro del dispositivo autenticado', async () => {
      prisma.sensor.findMany.mockResolvedValue([
        { id: 30, codigo: 'REL-K1-G3-D7', canal: 'rele:k1', unidad_medida: 'estado' },
        { id: 31, codigo: 'REL-K2-G3-D7', canal: 'rele:k2', unidad_medida: 'estado' },
      ]);

      await service.procesarReporte(7, [], [
        { canal: 'rele:k1', modo: 'automatico', encendido: true },
        { canal: 'rele:k2', modo: 'manual_local', encendido: false },
        // Canal sin relé registrado en este ESP32: se ignora.
        { canal: 'rele:k3', modo: 'automatico', encendido: false },
      ]);

      const consulta = prisma.sensor.findMany.mock.calls[0] as [
        { where: Record<string, unknown> },
      ];
      expect(consulta[0].where).toEqual({
        dispositivo_id: 7,
        OR: [
          { codigo: { in: [] } },
          { canal: { in: ['rele:k1', 'rele:k2', 'rele:k3'] } },
        ],
      });
      const guardados = (
        prisma.estadoActuador.upsert.mock.calls as Array<[{ where: { sensor_id: number } }]>
      ).map((c) => c[0].where.sensor_id);
      expect(guardados).toEqual([30, 31]);
    });

    it('sigue aceptando el estado por código del firmware anterior en un relé ya asociado a canal', async () => {
      prisma.sensor.findMany.mockResolvedValue([
        { id: 12, codigo: 'REL-K2-G1-01', canal: 'rele:k2', unidad_medida: 'estado' },
      ]);
      await service.procesarReporte(7, [], [
        { codigo: 'REL-K2-G1-01', modo: 'automatico', encendido: true },
      ]);
      const upsert = prisma.estadoActuador.upsert.mock.calls[0] as [
        { where: { sensor_id: number } },
      ];
      expect(upsert[0].where).toEqual({ sensor_id: 12 });
    });

    it('un sensor de estado que no es relé no se toma como relé', async () => {
      prisma.sensor.findMany.mockResolvedValue([
        { id: 40, codigo: 'MOT-ALIM-G1-01', canal: null, unidad_medida: 'estado' },
      ]);
      await service.procesarReporte(7, [], [
        { codigo: 'MOT-ALIM-G1-01', modo: 'manual_remoto', encendido: true, orden_id: 9 },
      ]);
      expect(prisma.estadoActuador.upsert).not.toHaveBeenCalled();
    });

    it('la confirmación de una orden por canal sigue exigiendo el mismo dispositivo y sesión', async () => {
      prisma.dispositivo.findUnique.mockResolvedValue({ arranque_id: 'S', arranque_anterior: null });
      prisma.sensor.findMany.mockResolvedValue([
        { id: 31, codigo: 'REL-K2-G3-D7', canal: 'rele:k2', unidad_medida: 'estado' },
      ]);
      await service.procesarReporte(
        7,
        [{ orden_id: 41, resultado: 'aplicada', estado_rele: true }],
        [{ canal: 'rele:k2', modo: 'manual_remoto', encendido: true, orden_id: 41 }],
        'S',
      );
      const confirmaciones = updates().filter((c) => c[0].data.estado === 'aplicada');
      expect(confirmaciones[0][0].where).toMatchObject({ id: 41, dispositivo_id: 7, arranque_entrega: 'S' });
      expect(confirmaciones[1][0].where).toMatchObject({
        id: 41,
        dispositivo_id: 7,
        sensor_id: 31,
        arranque_entrega: 'S',
      });
    });
  });

  describe('crear', () => {
    it('guarda la orden como "pendiente": crearla no enciende nada', async () => {
      prisma.sensor.findUnique.mockResolvedValue(releK2());
      prisma.ordenActuador.create.mockResolvedValue({ id: 41, estado: 'pendiente' });

      await service.crear({ sensor_id: 12, accion: 'encender' }, propietario);

      const calls = prisma.ordenActuador.create.mock.calls as Array<
        [{ data: Record<string, unknown> }]
      >;
      expect(calls[0][0].data).toEqual({
        dispositivo_id: 7,
        galpon_id: 3,
        sensor_id: 12,
        accion: 'encender',
        usuario_id: 5,
      });
    });

    it('404 si el sensor no existe', async () => {
      prisma.sensor.findUnique.mockResolvedValue(null);
      await expect(
        service.crear({ sensor_id: 99, accion: 'encender' }, propietario),
      ).rejects.toThrow(NotFoundException);
    });

    it('403 si el relé es de otro propietario', async () => {
      prisma.sensor.findUnique.mockResolvedValue(
        releK2({ galpon: { activo: true, granja: { propietario_id: 9 } } }),
      );
      await expect(
        service.crear({ sensor_id: 12, accion: 'encender' }, propietario),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.ordenActuador.create).not.toHaveBeenCalled();
    });

    it('403 si el operario no tiene asignado el galpón del relé', async () => {
      prisma.sensor.findUnique.mockResolvedValue(releK2());
      prisma.sensor.findFirst.mockResolvedValue(null); // fuera de su alcance
      await expect(
        service.crear({ sensor_id: 12, accion: 'apagar' }, operario),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.ordenActuador.create).not.toHaveBeenCalled();
    });

    it('400 si no es un relé controlable', async () => {
      prisma.sensor.findUnique.mockResolvedValue(releK2({ codigo: 'MOT-ALIM-G1-01' }));
      await expect(
        service.crear({ sensor_id: 12, accion: 'encender' }, propietario),
      ).rejects.toThrow(BadRequestException);
    });

    it('409 si el galpón está desactivado', async () => {
      prisma.sensor.findUnique.mockResolvedValue(
        releK2({ galpon: { activo: false, granja: { propietario_id: 5 } } }),
      );
      await expect(
        service.crear({ sensor_id: 12, accion: 'encender' }, propietario),
      ).rejects.toThrow(ConflictException);
    });

    it('409 si el ESP32 no se reporta: la orden no le llegaría', async () => {
      prisma.sensor.findUnique.mockResolvedValue(
        releK2({
          dispositivo: {
            activo: true,
            ultima_conexion: new Date(Date.now() - (EN_LINEA_SEGUNDOS + 5) * 1000),
          },
        }),
      );
      await expect(
        service.crear({ sensor_id: 12, accion: 'apagar' }, propietario),
      ).rejects.toThrow(ConflictException);
    });

    it('409 si ya hay una orden en curso para el mismo relé', async () => {
      prisma.sensor.findUnique.mockResolvedValue(releK2());
      prisma.ordenActuador.findFirst.mockResolvedValue({ id: 40 });
      await expect(
        service.crear({ sensor_id: 12, accion: 'apagar' }, propietario),
      ).rejects.toThrow(ConflictException);
      expect(prisma.ordenActuador.create).not.toHaveBeenCalled();
    });

    it('409 si otra petición simultánea ganó: el índice único parcial rechaza el insert', async () => {
      prisma.sensor.findUnique.mockResolvedValue(releK2());
      // El chequeo previo no vio nada (la otra petición aún no insertaba),
      // pero el insert choca con ordenes_actuadores_una_en_curso.
      prisma.ordenActuador.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
          meta: { target: 'ordenes_actuadores_una_en_curso' },
        }),
      );
      await expect(
        service.crear({ sensor_id: 12, accion: 'encender' }, propietario),
      ).rejects.toThrow(ConflictException);
    });

    it('un error de base distinto no se disfraza de conflicto', async () => {
      prisma.sensor.findUnique.mockResolvedValue(releK2());
      prisma.ordenActuador.create.mockRejectedValue(new Error('conexión perdida'));
      await expect(
        service.crear({ sensor_id: 12, accion: 'encender' }, propietario),
      ).rejects.toThrow('conexión perdida');
    });

    it('antes de comprobar "en curso" vence las órdenes de más de 60 s de ese relé', async () => {
      prisma.sensor.findUnique.mockResolvedValue(releK2());
      prisma.ordenActuador.create.mockResolvedValue({ id: 41 });
      const antes = Date.now();

      await service.crear({ sensor_id: 12, accion: 'encender' }, propietario);

      const expiracion = updates().find((c) => c[0].data.estado === 'expirada');
      expect(expiracion?.[0].where).toMatchObject({
        sensor_id: 12,
        estado: { in: ['pendiente', 'enviada'] },
      });
      const limite = (expiracion?.[0].where.fecha_creacion as { lt: Date }).lt.getTime();
      expect(antes - limite).toBeGreaterThanOrEqual(VIGENCIA_ORDEN_SEGUNDOS * 1000 - 50);
    });
  });

  describe('obtener', () => {
    it('403 si la orden es de un relé fuera del alcance', async () => {
      prisma.ordenActuador.findUnique.mockResolvedValue({
        sensor_id: 12,
        dispositivo: { galpon: { granja: { propietario_id: 9 } } },
      });
      await expect(service.obtener(41, propietario)).rejects.toThrow(ForbiddenException);
      expect(prisma.ordenActuador.findUniqueOrThrow).not.toHaveBeenCalled();
    });
  });

  describe('ultimasPorGalpon', () => {
    it('la última orden por relé sale de MAX(id) agrupado, y el estado informado dice si es vigente', async () => {
      prisma.galpon.findUnique.mockResolvedValue({ granja: { propietario_id: 5 } });
      prisma.ordenActuador.groupBy.mockResolvedValue([{ sensor_id: 12, _max: { id: 44 } }]);
      prisma.ordenActuador.findMany.mockResolvedValue([{ id: 44, sensor_id: 12 }]);
      prisma.estadoActuador.findMany.mockResolvedValue([
        { sensor_id: 12, modo: 'manual_remoto', encendido: true, orden_id: 44, reportado_en: new Date() },
        {
          sensor_id: 13,
          modo: 'manual_remoto',
          encendido: true,
          orden_id: 30,
          reportado_en: new Date(Date.now() - (EN_LINEA_SEGUNDOS + 10) * 1000),
        },
      ]);

      const res = await service.ultimasPorGalpon(3, propietario);

      const llamadas = prisma.ordenActuador.findMany.mock.calls as Array<
        [{ where: Record<string, unknown> }]
      >;
      expect(llamadas[0][0].where).toEqual({ id: { in: [44] } });
      expect(res.reles.find((r) => r.sensor_id === 12)?.vigente).toBe(true);
      // Un manual de hace rato no se presenta como actual.
      expect(res.reles.find((r) => r.sensor_id === 13)?.vigente).toBe(false);
    });

    it('404 si el galpón no existe', async () => {
      prisma.galpon.findUnique.mockResolvedValue(null);
      await expect(service.ultimasPorGalpon(99, propietario)).rejects.toThrow(NotFoundException);
    });
  });

  describe('entregarPendientes', () => {
    it('devuelve código y acción, y marca "enviada" solo lo que estaba pendiente', async () => {
      prisma.ordenActuador.findMany.mockResolvedValue([
        { id: 41, accion: 'encender', sensor: { codigo: 'REL-K2-G1-01' } },
      ]);

      const res = await service.entregarPendientes(7);

      expect(res).toEqual([{ id: 41, codigo: 'REL-K2-G1-01', accion: 'encender' }]);
      const marcado = updates().find((c) => c[0].data.estado === 'enviada');
      expect(marcado?.[0].where).toEqual({ id: { in: [41] }, estado: 'pendiente' });
    });

    it('solo entrega órdenes en curso: una confirmada, rechazada o incierta no vuelve a viajar', async () => {
      prisma.ordenActuador.findMany.mockResolvedValue([]);
      await service.entregarPendientes(7);
      const consulta = prisma.ordenActuador.findMany.mock.calls[0] as [
        { where: Record<string, unknown> },
      ];
      expect(consulta[0].where).toEqual({
        dispositivo_id: 7,
        sensor: { dispositivo_id: 7 },
        OR: [{ estado: 'pendiente' }, { estado: 'enviada', arranque_entrega: null }],
      });
    });

    it('entregar no confirma nada: la orden pasa a "enviada", nunca a "aplicada"', async () => {
      prisma.ordenActuador.findMany.mockResolvedValue([
        { id: 41, accion: 'encender', sensor: { codigo: 'REL-K2-G1-01' } },
      ]);
      await service.entregarPendientes(7, 'B');
      expect(updates().some((c) => c[0].data.estado === 'aplicada')).toBe(false);
    });
  });

  describe('procesarReporte', () => {
    it('una confirmación solo toca órdenes del mismo dispositivo y limpia el motivo previo', async () => {
      await service.procesarReporte(7, [
        { orden_id: 41, resultado: 'aplicada', estado_rele: true },
      ]);
      const [{ where, data }] = updates()[0];
      expect(where).toMatchObject({ id: 41, dispositivo_id: 7 });
      // Una aplicada tarde no conserva el "no confirmó a tiempo" de la expiración.
      expect(data).toMatchObject({ estado: 'aplicada', estado_real: true, motivo: null });
    });

    it('una confirmación tardía puede cerrar una orden expirada o incierta', async () => {
      await service.procesarReporte(7, [{ orden_id: 41, resultado: 'aplicada' }]);
      expect(updates()[0][0].where).toMatchObject({
        estado: { in: ['pendiente', 'enviada', 'expirada', 'incierta'] },
      });
    });

    it('"revertida" solo puede cerrar una orden que estaba aplicada', async () => {
      await service.procesarReporte(7, [
        { orden_id: 41, resultado: 'revertida', motivo: 'tanque lleno' },
      ]);
      expect(updates()[0][0].where).toMatchObject({ estado: 'aplicada' });
    });

    it('sin reporte de relés (firmware anterior) no guarda estado ni reconcilia', async () => {
      await service.procesarReporte(7, []);
      expect(prisma.sensor.findMany).not.toHaveBeenCalled();
      expect(prisma.estadoActuador.upsert).not.toHaveBeenCalled();
    });

    describe('con el estado actual de los relés', () => {
      beforeEach(() => {
        prisma.sensor.findMany.mockResolvedValue([
          { id: 12, codigo: 'REL-K2-G1-01', unidad_medida: 'estado' },
          { id: 20, codigo: 'MOT-PERS-G1-01', unidad_medida: 'estado' },
        ]);
      });

      it('guarda modo y salida solo de relés controlables de este dispositivo', async () => {
        await service.procesarReporte(7, [], [
          { codigo: 'REL-K2-G1-01', modo: 'automatico', encendido: false },
          { codigo: 'MOT-PERS-G1-01', modo: 'automatico', encendido: true },
          { codigo: 'REL-K1-OTRO-01', modo: 'automatico', encendido: true },
        ]);
        const consulta = prisma.sensor.findMany.mock.calls[0] as [
          { where: Record<string, unknown> },
        ];
        expect(consulta[0].where).toMatchObject({ dispositivo_id: 7 });
        expect(prisma.estadoActuador.upsert).toHaveBeenCalledTimes(1);
        const upsert = prisma.estadoActuador.upsert.mock.calls[0] as [
          { where: { sensor_id: number } },
        ];
        expect(upsert[0].where).toEqual({ sensor_id: 12 });
      });

      it('si el relé sigue en manual por una orden, esa orden queda aplicada aunque su resultado se perdiera', async () => {
        await service.procesarReporte(7, [], [
          { codigo: 'REL-K2-G1-01', modo: 'manual_remoto', encendido: true, orden_id: 41 },
        ]);
        const confirmacion = updates().find(
          (c) => c[0].data.estado === 'aplicada',
        );
        expect(confirmacion?.[0].where).toMatchObject({
          id: 41,
          dispositivo_id: 7,
          sensor_id: 12,
          estado: { in: ['pendiente', 'enviada', 'expirada'] },
        });
        expect(confirmacion?.[0].data).toMatchObject({ estado_real: true, motivo: null });
      });

      it('las demás aplicadas del relé pasan a revertida, con el motivo de reemplazo', async () => {
        await service.procesarReporte(7, [], [
          { codigo: 'REL-K2-G1-01', modo: 'manual_remoto', encendido: false, orden_id: 42 },
        ]);
        const reversion = updates().find((c) => c[0].data.estado === 'revertida');
        expect(reversion?.[0].where).toMatchObject({
          sensor_id: 12,
          estado: 'aplicada',
          id: { not: 42 },
        });
        expect(reversion?.[0].data.motivo).toContain('#42');
      });

      it('si el relé volvió a automático, su orden aplicada pasa a revertida', async () => {
        await service.procesarReporte(7, [], [
          { codigo: 'REL-K2-G1-01', modo: 'automatico', encendido: false },
        ]);
        const reversion = updates().find((c) => c[0].data.estado === 'revertida');
        expect(reversion?.[0].where).not.toHaveProperty('id');
        expect(reversion?.[0].data.motivo).toContain('automático');
      });

      it('un orden_id en modo automático se ignora: solo el manual remoto lo sostiene', async () => {
        await service.procesarReporte(7, [], [
          { codigo: 'REL-K2-G1-01', modo: 'automatico', encendido: false, orden_id: 41 },
        ]);
        expect(updates().some((c) => c[0].data.estado === 'aplicada')).toBe(false);
        const upsert = prisma.estadoActuador.upsert.mock.calls[0] as [
          { update: { orden_id: number | null } },
        ];
        expect(upsert[0].update.orden_id).toBeNull();
      });
    });
  });

  // B3: cada encendido del ESP32 trae un arranque_id nuevo. Lo ambiguo es
  // una orden que el ESP32 recibió y no confirmó antes de reiniciarse: pudo
  // aplicarla y perder la confirmación. Ni se inventa "aplicada" ni se repite.
  describe('sesión de arranque (reinicio del ESP32)', () => {
    const SESION_A = '11111111-1111-4111-8111-111111111111';
    const SESION_B = '22222222-2222-4222-8222-222222222222';

    it('un arranque nuevo deja "incierta" toda "enviada" a otra sesión y no la da por aplicada', async () => {
      prisma.dispositivo.findUnique.mockResolvedValue({ arranque_id: SESION_A, arranque_anterior: null });

      const sesion = await service.procesarReporte(7, [], undefined, SESION_B);

      expect(sesion).toBe('actual');
      const incierta = updates().find((c) => c[0].data.estado === 'incierta');
      expect(incierta?.[0].where).toEqual({
        dispositivo_id: 7,
        estado: 'enviada',
        OR: [{ arranque_entrega: null }, { arranque_entrega: { not: SESION_B } }],
      });
      expect(String(incierta?.[0].data.motivo)).toContain('no se sabe si llegó a aplicarse');
      expect(updates().some((c) => c[0].data.estado === 'aplicada')).toBe(false);
    });

    it('tras el reinicio las aplicadas de encender/apagar pasan a revertida: el relé arrancó en automático', async () => {
      prisma.dispositivo.findUnique.mockResolvedValue({ arranque_id: SESION_A, arranque_anterior: null });

      await service.procesarReporte(7, [], undefined, SESION_B);

      const revertida = updates().find((c) => c[0].data.estado === 'revertida');
      expect(revertida?.[0].where).toMatchObject({ dispositivo_id: 7, estado: 'aplicada' });
      expect(String(revertida?.[0].data.motivo)).toContain('reinició');
    });

    it('guarda la sesión nueva y recuerda la anterior', async () => {
      prisma.dispositivo.findUnique.mockResolvedValue({ arranque_id: SESION_A, arranque_anterior: null });

      await service.procesarReporte(7, [], undefined, SESION_B);

      const llamada = prisma.dispositivo.update.mock.calls[0] as [
        { where: { id: number }; data: Record<string, unknown> },
      ];
      expect(llamada[0].where).toEqual({ id: 7 });
      expect(llamada[0].data).toMatchObject({ arranque_id: SESION_B, arranque_anterior: SESION_A });
    });

    it('el primer envío con arranque_id tras flashear (antes sin él) también cuenta como reinicio', async () => {
      prisma.dispositivo.findUnique.mockResolvedValue({ arranque_id: null, arranque_anterior: null });

      await service.procesarReporte(7, [], undefined, SESION_B);

      expect(updates().some((c) => c[0].data.estado === 'incierta')).toBe(true);
    });

    it('la misma sesión no dispara nada de reinicio', async () => {
      prisma.dispositivo.findUnique.mockResolvedValue({ arranque_id: SESION_B, arranque_anterior: SESION_A });

      const sesion = await service.procesarReporte(7, [], undefined, SESION_B);

      expect(sesion).toBe('actual');
      expect(updates().some((c) => c[0].data.estado === 'incierta')).toBe(false);
      expect(prisma.dispositivo.update).not.toHaveBeenCalled();
    });

    it('una "pendiente" se entrega a la sesión nueva (nunca salió); una "enviada" solo a la sesión que la recibió', async () => {
      prisma.ordenActuador.findMany.mockResolvedValue([
        { id: 41, accion: 'encender', sensor: { codigo: 'REL-K2-G1-01' } },
      ]);

      await service.entregarPendientes(7, SESION_B);

      const consulta = prisma.ordenActuador.findMany.mock.calls[0] as [
        { where: Record<string, unknown> },
      ];
      expect(consulta[0].where).toEqual({
        dispositivo_id: 7,
        sensor: { dispositivo_id: 7 },
        OR: [{ estado: 'pendiente' }, { estado: 'enviada', arranque_entrega: SESION_B }],
      });
      const marcado = updates().find((c) => c[0].data.estado === 'enviada');
      expect(marcado?.[0].data).toMatchObject({ arranque_entrega: SESION_B });
    });

    it('una confirmación solo vale si viene de la sesión que recibió la orden', async () => {
      prisma.dispositivo.findUnique.mockResolvedValue({ arranque_id: SESION_B, arranque_anterior: SESION_A });

      await service.procesarReporte(7, [{ orden_id: 41, resultado: 'aplicada' }], undefined, SESION_B);

      const confirmacion = updates().find((c) => c[0].data.estado === 'aplicada');
      expect(confirmacion?.[0].where).toMatchObject({ id: 41, arranque_entrega: SESION_B });
    });

    it('resultado perdido y confirmación tardía: un envío retrasado de la sesión anterior puede cerrar su incierta, pero no toca el estado actual', async () => {
      prisma.dispositivo.findUnique.mockResolvedValue({ arranque_id: SESION_B, arranque_anterior: SESION_A });

      const sesion = await service.procesarReporte(
        7,
        [{ orden_id: 41, resultado: 'aplicada', estado_rele: true }],
        [{ codigo: 'REL-K2-G1-01', modo: 'manual_remoto', encendido: true, orden_id: 41 }],
        SESION_A,
      );

      expect(sesion).toBe('anterior');
      const confirmacion = updates().find((c) => c[0].data.estado === 'aplicada');
      expect(confirmacion?.[0].where).toMatchObject({
        id: 41,
        arranque_entrega: SESION_A,
        estado: { in: ['pendiente', 'enviada', 'expirada', 'incierta'] },
      });
      // Esos relés ya no están así: no se guarda como estado actual.
      expect(prisma.estadoActuador.upsert).not.toHaveBeenCalled();
      expect(prisma.dispositivo.update).not.toHaveBeenCalled();
    });

    it('la confirmación por estado de relés solo acepta órdenes de la misma sesión', async () => {
      prisma.dispositivo.findUnique.mockResolvedValue({ arranque_id: SESION_B, arranque_anterior: SESION_A });
      prisma.sensor.findMany.mockResolvedValue([
        { id: 12, codigo: 'REL-K2-G1-01', unidad_medida: 'estado' },
      ]);

      await service.procesarReporte(
        7,
        [],
        [{ codigo: 'REL-K2-G1-01', modo: 'manual_remoto', encendido: true, orden_id: 41 }],
        SESION_B,
      );

      const porEstado = updates().find(
        (c) => c[0].data.estado === 'aplicada' && c[0].where.sensor_id === 12,
      );
      expect(porEstado?.[0].where).toMatchObject({ id: 41, arranque_entrega: SESION_B });
    });

    it('firmware sin arranque_id: no se detectan reinicios y solo valen órdenes entregadas sin sesión', async () => {
      const sesion = await service.procesarReporte(7, [{ orden_id: 41, resultado: 'rechazada' }]);

      expect(sesion).toBe('legado');
      expect(prisma.dispositivo.findUnique).not.toHaveBeenCalled();
      expect(updates()[0][0].where).toMatchObject({ arranque_entrega: null });
    });
  });
});
