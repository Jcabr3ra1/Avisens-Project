import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AlertasService } from './alertas.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EstadoAlerta } from '@prisma/client';
import { ROLES } from '../../common/auth/roles';
import type { Solicitante } from '../../common/auth/acceso';

describe('AlertasService', () => {
  let service: AlertasService;

  const prisma = {
    galpon: { findFirst: jest.fn(), findUnique: jest.fn() },
    lote: { findUnique: jest.fn() },
    sensor: { findUnique: jest.fn() },
    umbralAmbiental: { findFirst: jest.fn() },
    usuarioGalpon: { findMany: jest.fn() },
    notificacion: { createMany: jest.fn() },
    usuario: { findUnique: jest.fn() },
    alerta: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const admin: Solicitante = { id: 1, rol: ROLES.ADMINISTRADOR };
  const propietario: Solicitante = { id: 5, rol: ROLES.PROPIETARIO };
  const operario: Solicitante = {
    id: 8,
    rol: ROLES.OPERARIO,
    organizacion_id: 10,
  };

  const galponDeOtro = { id: 1, granja: { propietario_id: 999 } };
  const galponPropio = { id: 1, granja: { propietario_id: propietario.id } };

  const alertaDe = (propietarioId: number) => ({
    id: 1,
    estado: 'abierta',
    galpon: { id: 1, granja: { id: 1, propietario_id: propietarioId } },
  });

  const dtoCrear = {
    galpon_id: 1,
    tipo: 'temperatura_alta',
    criticidad: 'alta',
    mensaje: 'Temperatura sobre el umbral',
  };

  const paginacion = { page: 1, limit: 10 };

  const soloDelPropietario = {
    galpon: { granja: { propietario_id: propietario.id } },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlertasService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<AlertasService>(AlertasService);
    prisma.$transaction.mockResolvedValue([[], 0]);
  });

  describe('crear', () => {
    it('lanza Forbidden cuando el galpon no es del propietario', async () => {
      prisma.galpon.findUnique.mockResolvedValue(galponDeOtro);
      await expect(service.crear(dtoCrear, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.alerta.create).not.toHaveBeenCalled();
    });

    it('crea la alerta cuando el galpon es del propietario', async () => {
      prisma.galpon.findUnique.mockResolvedValue(galponPropio);
      prisma.alerta.create.mockResolvedValue({ id: 1 });
      const r = await service.crear(dtoCrear, propietario);
      expect(r).toEqual({ id: 1 });
    });

    it('lanza NotFound cuando el galpon no existe', async () => {
      prisma.galpon.findUnique.mockResolvedValue(null);
      await expect(service.crear(dtoCrear, admin)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.alerta.create).not.toHaveBeenCalled();
    });

    it('no consulta lote ni sensor cuando el dto no los trae', async () => {
      prisma.galpon.findUnique.mockResolvedValue(galponPropio);
      prisma.alerta.create.mockResolvedValue({ id: 1 });

      await service.crear(dtoCrear, admin);

      expect(prisma.lote.findUnique).not.toHaveBeenCalled();
      expect(prisma.sensor.findUnique).not.toHaveBeenCalled();
    });

    it('lanza NotFound cuando el lote indicado no existe', async () => {
      prisma.galpon.findUnique.mockResolvedValue(galponPropio);
      prisma.lote.findUnique.mockResolvedValue(null);

      await expect(
        service.crear({ ...dtoCrear, lote_id: 9 }, admin),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.alerta.create).not.toHaveBeenCalled();
    });

    it('impide al propietario colgar la alerta de un lote ajeno', async () => {
      prisma.galpon.findUnique.mockResolvedValue(galponPropio);
      prisma.lote.findUnique.mockResolvedValue({
        id: 9,
        galpon: { granja: { propietario_id: 999 } },
      });

      await expect(
        service.crear({ ...dtoCrear, lote_id: 9 }, propietario),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.alerta.create).not.toHaveBeenCalled();
    });

    it('lanza NotFound cuando el sensor indicado no existe', async () => {
      prisma.galpon.findUnique.mockResolvedValue(galponPropio);
      prisma.sensor.findUnique.mockResolvedValue(null);

      await expect(
        service.crear({ ...dtoCrear, sensor_id: 3 }, admin),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.alerta.create).not.toHaveBeenCalled();
    });

    it('impide al propietario colgar la alerta de un sensor ajeno', async () => {
      prisma.galpon.findUnique.mockResolvedValue(galponPropio);
      prisma.sensor.findUnique.mockResolvedValue({
        id: 3,
        galpon: { granja: { propietario_id: 999 } },
      });

      await expect(
        service.crear({ ...dtoCrear, sensor_id: 3 }, propietario),
      ).rejects.toThrow(ForbiddenException);
    });

    it('crea la alerta con lote y sensor propios', async () => {
      prisma.galpon.findUnique.mockResolvedValue(galponPropio);
      prisma.lote.findUnique.mockResolvedValue({
        id: 9,
        galpon: { granja: { propietario_id: propietario.id } },
      });
      prisma.sensor.findUnique.mockResolvedValue({
        id: 3,
        galpon: { granja: { propietario_id: propietario.id } },
      });
      prisma.alerta.create.mockResolvedValue({ id: 1 });

      const r = await service.crear(
        { ...dtoCrear, lote_id: 9, sensor_id: 3 },
        propietario,
      );

      expect(r).toEqual({ id: 1 });
      expect(prisma.lote.findUnique).toHaveBeenCalled();
      expect(prisma.sensor.findUnique).toHaveBeenCalled();
    });
  });

  describe('evaluarLectura', () => {
    // semana_vida elige el rango ambiental del galpón. Se cuenta desde el día
    // de vida, que empieza en 1, así que la primera semana va del día 1 al 7.
    // Sin el ajuste, el día 7 caería en la semana siguiente y se compararía
    // contra el umbral equivocado un día antes cada semana.
    describe('semana de vida con la que busca el umbral', () => {
      const prepararSensorConLote = (fechaIngreso: Date) => {
        prisma.sensor.findUnique.mockResolvedValue({
          id: 3,
          tipo: 'Temperatura',
          galpon_id: 1,
          galpon: {
            nombre: 'Galpón Norte',
            granja: { propietario_id: 5 },
            lotes: [{ fecha_ingreso: fechaIngreso }],
          },
        });
        prisma.umbralAmbiental.findFirst.mockResolvedValue(null);
      };

      const semanaConsultada = (): number => {
        const llamadas = prisma.umbralAmbiental.findFirst.mock
          .calls as unknown as Array<[{ where: { semana_vida: number } }]>;
        return llamadas[0][0].where.semana_vida;
      };

      it('el día 1 y el día 7 caen en la semana 0', async () => {
        prepararSensorConLote(new Date('2026-08-01T00:00:00.000Z'));
        await service.evaluarLectura(3, 25, new Date('2026-08-01T15:00:00Z'));
        expect(semanaConsultada()).toBe(0);

        jest.clearAllMocks();
        prepararSensorConLote(new Date('2026-08-01T00:00:00.000Z'));
        await service.evaluarLectura(3, 25, new Date('2026-08-07T15:00:00Z'));
        expect(semanaConsultada()).toBe(0);
      });

      it('el día 8 ya es la semana 1', async () => {
        prepararSensorConLote(new Date('2026-08-01T00:00:00.000Z'));
        await service.evaluarLectura(3, 25, new Date('2026-08-08T15:00:00Z'));
        expect(semanaConsultada()).toBe(1);
      });

      // A las 02:00 UTC en la granja son las 21:00 del día anterior.
      it('usa el día de la granja, no el del servidor', async () => {
        prepararSensorConLote(new Date('2026-08-01T00:00:00.000Z'));
        await service.evaluarLectura(3, 25, new Date('2026-08-08T02:00:00Z'));
        expect(semanaConsultada()).toBe(0);
      });
    });

    it('crea una alerta y notifica cuando una lectura supera el umbral', async () => {
      prisma.sensor.findUnique.mockResolvedValue({
        id: 3,
        tipo: 'Temperatura',
        galpon_id: 1,
        galpon: {
          nombre: 'Galpón Norte',
          granja: { propietario_id: 5 },
          lotes: [],
        },
      });
      prisma.umbralAmbiental.findFirst.mockResolvedValue({
        valor_minimo: 20,
        valor_maximo: 30,
      });
      prisma.alerta.findFirst.mockResolvedValue(null);
      prisma.alerta.create.mockResolvedValue({
        id: 12,
        mensaje: 'Temperatura fuera del rango seguro en Galpón Norte.',
      });
      prisma.usuarioGalpon.findMany.mockResolvedValue([{ usuario_id: 8 }]);

      await service.evaluarLectura(3, 35, new Date('2026-08-30T12:00:00Z'));

      const llamadasCrear = prisma.alerta.create.mock.calls as unknown as Array<[
        { data: Record<string, unknown> },
      ]>;
      const llamadasNotificar =
        prisma.notificacion.createMany.mock.calls as unknown as Array<[
          { data: Array<Record<string, unknown>> },
        ]>;
      const llamadaCrear = llamadasCrear[0]?.[0];
      const llamadaNotificar = llamadasNotificar[0]?.[0];

      expect(llamadaCrear?.data).toMatchObject({
        sensor_id: 3,
        galpon_id: 1,
        criticidad: 'alta',
        valor_detectado: 35,
      });
      expect(llamadaNotificar?.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ usuario_id: 5, referencia_id: 12 }),
          expect.objectContaining({ usuario_id: 8, referencia_id: 12 }),
        ]),
      );
    });

    it('actualiza la alerta abierta sin crear una duplicada', async () => {
      prisma.sensor.findUnique.mockResolvedValue({
        id: 3,
        tipo: 'Temperatura',
        galpon_id: 1,
        galpon: {
          nombre: 'Galpón Norte',
          granja: { propietario_id: 5 },
          lotes: [],
        },
      });
      prisma.umbralAmbiental.findFirst.mockResolvedValue({
        valor_minimo: 20,
        valor_maximo: 30,
      });
      prisma.alerta.findFirst.mockResolvedValue({ id: 12 });

      await service.evaluarLectura(3, 35);

      expect(prisma.alerta.create).not.toHaveBeenCalled();
      expect(prisma.alerta.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 12 },
          data: { valor_detectado: 35 },
        }),
      );
    });
  });

  describe('listar', () => {
    it('el administrador ve todas las alertas', async () => {
      await service.listar(admin, paginacion);
      expect(prisma.alerta.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it('el propietario solo ve las de sus granjas', async () => {
      await service.listar(propietario, paginacion);
      expect(prisma.alerta.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: soloDelPropietario }),
      );
      expect(prisma.alerta.count).toHaveBeenCalledWith({
        where: soloDelPropietario,
      });
    });

    it('el Operario solo ve alertas de galpones asignados', async () => {
      await service.listar(operario, paginacion);

      expect(prisma.alerta.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            galpon: {
              activo: true,
              granja: {
                activa: true,
                organizacion_id: 10,
                organizacion: { activa: true },
              },
              usuarios_galpones: {
                some: { usuario_id: 8, activa: true },
              },
            },
          },
        }),
      );
    });
  });

  describe('obtener', () => {
    it('lanza NotFound cuando la alerta no existe', async () => {
      prisma.alerta.findUnique.mockResolvedValue(null);
      await expect(service.obtener(99, admin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lanza Forbidden cuando la alerta es de otra granja', async () => {
      prisma.alerta.findUnique.mockResolvedValue(alertaDe(999));
      await expect(service.obtener(1, propietario)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('devuelve la alerta propia', async () => {
      prisma.alerta.findUnique.mockResolvedValue(alertaDe(propietario.id));
      const r = await service.obtener(1, propietario);
      expect(r.id).toBe(1);
    });
  });

  describe('actualizar', () => {
    const conAlertaPropia = () =>
      prisma.alerta.findUnique.mockResolvedValue(alertaDe(propietario.id));

    const datosDeLaLlamada = () => {
      const [args] = prisma.alerta.update.mock.calls[0] as [
        { data: Record<string, unknown> },
      ];
      return args.data;
    };

    it('lanza NotFound cuando el responsable asignado no existe', async () => {
      conAlertaPropia();
      prisma.usuario.findUnique.mockResolvedValue(null);

      await expect(
        service.actualizar(1, { responsable_id: 42 }, propietario),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.alerta.update).not.toHaveBeenCalled();
    });

    it('asigna el responsable cuando el usuario existe', async () => {
      conAlertaPropia();
      prisma.usuario.findUnique.mockResolvedValue({ id: 42 });
      prisma.alerta.update.mockResolvedValue({ id: 1 });

      await service.actualizar(1, { responsable_id: 42 }, admin);

      expect(datosDeLaLlamada()).toEqual({ responsable_id: 42 });
    });

    it('permite desasignar el responsable con null, sin consultar usuarios', async () => {
      conAlertaPropia();
      prisma.alerta.update.mockResolvedValue({ id: 1 });

      await service.actualizar(1, { responsable_id: null }, admin);

      expect(prisma.usuario.findUnique).not.toHaveBeenCalled();
      expect(datosDeLaLlamada()).toEqual({ responsable_id: null });
    });

    it('lanza NotFound cuando el usuario a escalar no existe', async () => {
      conAlertaPropia();
      prisma.usuario.findUnique.mockResolvedValue(null);

      await expect(
        service.actualizar(1, { escalado_a_id: 42 }, admin),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.alerta.update).not.toHaveBeenCalled();
    });

    it('permite desasignar el escalado con null', async () => {
      conAlertaPropia();
      prisma.alerta.update.mockResolvedValue({ id: 1 });

      await service.actualizar(1, { escalado_a_id: null }, admin);

      expect(prisma.usuario.findUnique).not.toHaveBeenCalled();
      expect(datosDeLaLlamada()).toEqual({ escalado_a_id: null });
    });

    it('convierte las fechas de texto a Date', async () => {
      conAlertaPropia();
      prisma.alerta.update.mockResolvedValue({ id: 1 });

      await service.actualizar(
        1,
        {
          fecha_aceptacion: '2026-08-25T10:00:00.000Z',
          fecha_cierre: '2026-08-25T12:00:00.000Z',
        },
        admin,
      );

      const data = datosDeLaLlamada();
      expect(data.fecha_aceptacion).toBeInstanceOf(Date);
      expect(data.fecha_cierre).toBeInstanceOf(Date);
    });

    it('convierte una fecha vacia en null en vez de una fecha invalida', async () => {
      conAlertaPropia();
      prisma.alerta.update.mockResolvedValue({ id: 1 });

      await service.actualizar(1, { fecha_cierre: '' }, admin);

      expect(datosDeLaLlamada()).toEqual({ fecha_cierre: null });
    });

    it('con un dto vacio no escribe nada y devuelve la alerta tal cual', async () => {
      conAlertaPropia();

      const r = await service.actualizar(1, {}, admin);

      expect(prisma.alerta.update).not.toHaveBeenCalled();
      expect(r.id).toBe(1);
    });

    it('asigna el escalado cuando el usuario existe', async () => {
      conAlertaPropia();
      prisma.usuario.findUnique.mockResolvedValue({ id: 42 });
      prisma.alerta.update.mockResolvedValue({ id: 1 });

      await service.actualizar(1, { escalado_a_id: 42 }, admin);

      expect(datosDeLaLlamada()).toEqual({ escalado_a_id: 42 });
    });

    it('escribe estado y accion correctiva cuando vienen en el dto', async () => {
      conAlertaPropia();
      prisma.alerta.update.mockResolvedValue({ id: 1 });

      await service.actualizar(
        1,
        {
          estado: EstadoAlerta.cerrada,
          accion_correctiva: 'Se ajusto la ventilacion',
        },
        admin,
      );

      expect(datosDeLaLlamada()).toEqual({
        estado: EstadoAlerta.cerrada,
        accion_correctiva: 'Se ajusto la ventilacion',
      });
    });

    it('impide al propietario actualizar una alerta ajena', async () => {
      prisma.alerta.findUnique.mockResolvedValue(alertaDe(999));

      await expect(
        service.actualizar(1, { estado: EstadoAlerta.cerrada }, propietario),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.alerta.update).not.toHaveBeenCalled();
    });
  });

  describe('aceptar', () => {
    it('pasa a en_proceso y deja al solicitante como responsable', async () => {
      prisma.alerta.findUnique.mockResolvedValue(alertaDe(propietario.id));
      prisma.alerta.update.mockResolvedValue({ id: 1 });

      await service.aceptar(1, propietario);

      const [args] = prisma.alerta.update.mock.calls[0] as [
        {
          data: {
            estado: string;
            responsable_id: number;
            fecha_aceptacion: Date;
          };
        },
      ];
      expect(args.data.estado).toBe('en_proceso');
      expect(args.data.responsable_id).toBe(propietario.id);
      expect(args.data.fecha_aceptacion).toBeInstanceOf(Date);
    });

    it('impide aceptar una alerta ajena', async () => {
      prisma.alerta.findUnique.mockResolvedValue(alertaDe(999));
      await expect(service.aceptar(1, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.alerta.update).not.toHaveBeenCalled();
    });
  });

  describe('cerrar', () => {
    it('pasa a cerrada y guarda la accion correctiva', async () => {
      prisma.alerta.findUnique.mockResolvedValue(alertaDe(propietario.id));
      prisma.alerta.update.mockResolvedValue({ id: 1 });

      await service.cerrar(
        1,
        { accion_correctiva: 'Se abrio la cortina' },
        admin,
      );

      const [args] = prisma.alerta.update.mock.calls[0] as [
        {
          data: {
            estado: string;
            accion_correctiva: string;
            fecha_cierre: Date;
          };
        },
      ];
      expect(args.data.estado).toBe('cerrada');
      expect(args.data.accion_correctiva).toBe('Se abrio la cortina');
      expect(args.data.fecha_cierre).toBeInstanceOf(Date);
    });

    it('impide cerrar una alerta ajena', async () => {
      prisma.alerta.findUnique.mockResolvedValue(alertaDe(999));
      await expect(
        service.cerrar(1, { accion_correctiva: 'x' }, propietario),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('escalar', () => {
    it('asigna el escalado y pasa a en_proceso', async () => {
      prisma.alerta.findUnique.mockResolvedValue(alertaDe(propietario.id));
      prisma.usuario.findUnique.mockResolvedValue({ id: 42 });
      prisma.alerta.update.mockResolvedValue({ id: 1 });

      await service.escalar(1, 42, admin);

      const [args] = prisma.alerta.update.mock.calls[0] as [
        { data: { escalado_a_id: number; estado: string } },
      ];
      expect(args.data.escalado_a_id).toBe(42);
      expect(args.data.estado).toBe('en_proceso');
    });

    it('lanza NotFound cuando el usuario a escalar no existe', async () => {
      prisma.alerta.findUnique.mockResolvedValue(alertaDe(propietario.id));
      prisma.usuario.findUnique.mockResolvedValue(null);

      await expect(service.escalar(1, 42, admin)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.alerta.update).not.toHaveBeenCalled();
    });
  });

  describe('eliminar', () => {
    it('borra fisicamente la alerta del propietario', async () => {
      prisma.alerta.findUnique.mockResolvedValue(alertaDe(propietario.id));
      prisma.alerta.delete.mockResolvedValue({ id: 1 });

      const r = await service.eliminar(1, propietario);

      expect(r).toEqual({ id: 1, eliminado: true });
    });

    it('impide borrar una alerta ajena', async () => {
      prisma.alerta.findUnique.mockResolvedValue(alertaDe(999));
      await expect(service.eliminar(1, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.alerta.delete).not.toHaveBeenCalled();
    });
  });

  describe('obtenerEstadisticas', () => {
    const contadores = (
      total: number,
      abiertas: number,
      enProceso: number,
      cerradas: number,
      criticas: number,
    ) => {
      prisma.alerta.count
        .mockResolvedValueOnce(total)
        .mockResolvedValueOnce(abiertas)
        .mockResolvedValueOnce(enProceso)
        .mockResolvedValueOnce(cerradas)
        .mockResolvedValueOnce(criticas);
    };

    it('calcula la tasa de resolucion sobre el total', async () => {
      contadores(10, 3, 2, 5, 4);

      const r = await service.obtenerEstadisticas(admin);

      expect(r).toEqual({
        total: 10,
        abiertas: 3,
        en_proceso: 2,
        cerradas: 5,
        criticas: 4,
        tasa_resolucion: 50,
      });
    });

    it('devuelve tasa 0 sin alertas, sin dividir entre cero', async () => {
      contadores(0, 0, 0, 0, 0);

      const r = await service.obtenerEstadisticas(admin);

      expect(r.tasa_resolucion).toBe(0);
      expect(Number.isNaN(r.tasa_resolucion)).toBe(false);
    });

    it('el propietario solo cuenta las alertas de sus granjas', async () => {
      contadores(0, 0, 0, 0, 0);

      await service.obtenerEstadisticas(propietario);

      expect(prisma.alerta.count).toHaveBeenCalledWith({
        where: soloDelPropietario,
      });
      expect(prisma.alerta.count).toHaveBeenCalledWith({
        where: { ...soloDelPropietario, estado: 'abierta' },
      });
      // Contaba 'critica', que ningún camino automático escribe. Ahora cuenta
      // 'alta', que es el techo del cálculo desde umbrales: si no, el tablero
      // decía cero mientras había lecturas muy fuera de rango.
      expect(prisma.alerta.count).toHaveBeenCalledWith({
        where: { ...soloDelPropietario, criticidad: { in: ['alta'] } },
      });
    });
  });

  describe('obtenerPorGalpon', () => {
    it('filtra por el galpon indicado', async () => {
      prisma.galpon.findUnique.mockResolvedValue(galponPropio);

      await service.obtenerPorGalpon(1, propietario, paginacion);

      expect(prisma.alerta.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { galpon_id: 1 } }),
      );
    });

    it('impide consultar un galpon ajeno', async () => {
      prisma.galpon.findUnique.mockResolvedValue(galponDeOtro);

      await expect(
        service.obtenerPorGalpon(1, propietario, paginacion),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('obtenerPorLote', () => {
    it('filtra por el lote indicado', async () => {
      prisma.lote.findUnique.mockResolvedValue({
        id: 9,
        galpon: { granja: { propietario_id: propietario.id } },
      });

      await service.obtenerPorLote(9, propietario, paginacion);

      expect(prisma.alerta.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { lote_id: 9 } }),
      );
    });

    it('impide consultar un lote ajeno', async () => {
      prisma.lote.findUnique.mockResolvedValue({
        id: 9,
        galpon: { granja: { propietario_id: 999 } },
      });

      await expect(
        service.obtenerPorLote(9, propietario, paginacion),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
