import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  ACCION_ESCALADA_AUTO,
  AlertasEscalamientoService,
} from './alertas-escalamiento.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { ROLES } from '../../common/auth/roles';

describe('AlertasEscalamientoService', () => {
  let service: AlertasEscalamientoService;

  const prisma = {
    alerta: { findMany: jest.fn(), updateMany: jest.fn() },
    usuarioGalpon: { findMany: jest.fn() },
    notificacion: { create: jest.fn() },
    bitacoraAuditoria: { findMany: jest.fn() },
  };

  const auditoria = { registrar: jest.fn() };
  const config = {
    get: jest.fn((clave: string) => {
      if (clave === 'ALERTA_ESCALAMIENTO_CRITICA_MIN') return '15';
      if (clave === 'ALERTA_ESCALAMIENTO_MIN') return '30';
      return undefined;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertasEscalamientoService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditoriaService, useValue: auditoria },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get<AlertasEscalamientoService>(
      AlertasEscalamientoService,
    );
  });

  describe('tiempoLimiteMinutos', () => {
    it('usa 15 min para criticidad alta/crítica y 30 min para media/baja', () => {
      expect(service.tiempoLimiteMinutos('alta')).toBe(15);
      expect(service.tiempoLimiteMinutos('crítica')).toBe(15);
      expect(service.tiempoLimiteMinutos('media')).toBe(30);
      expect(service.tiempoLimiteMinutos('baja')).toBe(30);
    });
  });

  describe('escalarAlertasVencidas', () => {
    it('escala alerta crítica sin atender tras 15 min, notifica al propietario y audita', async () => {
      const ahora = new Date('2026-11-27T21:30:00.000Z');
      const creada = new Date('2026-11-27T21:10:00.000Z'); // 20 min antes

      prisma.alerta.findMany.mockResolvedValue([
        {
          id: 42,
          galpon_id: 3,
          tipo: 'temperatura_alta',
          criticidad: 'alta',
          valor_detectado: 35.4,
          valor_umbral: 32,
          mensaje: 'Temperatura elevada en Galpón 3',
          fecha_creacion: creada,
          responsable: null,
          galpon: {
            nombre: 'Galpón 3',
            granja: {
              propietario_id: 7,
              propietario: {
                id: 7,
                nombre_completo: 'Carlos Propietario',
                activo: true,
              },
            },
          },
        },
      ]);
      prisma.usuarioGalpon.findMany.mockResolvedValue([
        { usuario: { id: 12, nombre_completo: 'Luis Operario' } },
      ]);
      prisma.alerta.updateMany.mockResolvedValue({ count: 1 });

      const escaladas = await service.escalarAlertasVencidas(ahora);

      expect(escaladas).toBe(1);
      expect(prisma.alerta.updateMany).toHaveBeenCalledWith({
        where: { id: 42, estado: 'abierta', escalado_a_id: null },
        data: { escalado_a_id: 7, estado: 'en_proceso' },
      });
      const llamadasNotif = prisma.notificacion.create.mock.calls as Array<
        [{ data: Record<string, unknown> }]
      >;
      expect(llamadasNotif[0][0].data).toMatchObject({
        usuario_id: 7,
        tipo: 'alerta_escalada',
        referencia_tipo: 'alerta',
        referencia_id: 42,
      });
      expect(auditoria.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: ACCION_ESCALADA_AUTO,
          entidad_afectada: 'alertas',
          registro_id: 42,
          usuario_id: 12,
        }),
      );
    });

    it('no escala alerta media si solo han pasado 20 minutos (límite 30 min)', async () => {
      const ahora = new Date('2026-11-27T21:30:00.000Z');
      const creada = new Date('2026-11-27T21:10:00.000Z');

      prisma.alerta.findMany.mockResolvedValue([
        {
          id: 43,
          galpon_id: 3,
          tipo: 'humedad_alta',
          criticidad: 'media',
          valor_detectado: 75,
          valor_umbral: 70,
          mensaje: 'Humedad alta',
          fecha_creacion: creada,
          responsable: null,
          galpon: {
            nombre: 'Galpón 3',
            granja: {
              propietario_id: 7,
              propietario: {
                id: 7,
                nombre_completo: 'Carlos Propietario',
                activo: true,
              },
            },
          },
        },
      ]);

      const escaladas = await service.escalarAlertasVencidas(ahora);

      expect(escaladas).toBe(0);
      expect(prisma.alerta.updateMany).not.toHaveBeenCalled();
      expect(prisma.notificacion.create).not.toHaveBeenCalled();
    });
  });

  describe('listarHistorialEscalamientos', () => {
    it('combina alertas escaladas con auditoría de tiempos y responsables', async () => {
      const creada = new Date('2026-11-27T20:00:00.000Z');
      const escaladaEn = new Date('2026-11-27T20:16:00.000Z');
      const cerrada = new Date('2026-11-27T20:25:00.000Z');

      prisma.alerta.findMany.mockResolvedValue([
        {
          id: 50,
          tipo: 'temperatura_alta',
          criticidad: 'alta',
          valor_detectado: 34.5,
          valor_umbral: 32,
          mensaje: 'Sobre el umbral',
          estado: 'cerrada',
          fecha_creacion: creada,
          fecha_aceptacion: escaladaEn,
          fecha_cierre: cerrada,
          galpon: {
            id: 2,
            nombre: 'Galpón 2',
            codigo: 'G-02',
            granja: { id: 1, nombre: 'La Esperanza' },
          },
          responsable: null,
          escalado_a: {
            id: 7,
            nombre_completo: 'Carlos Propietario',
            email: 'carlos@granja.co',
          },
        },
      ]);

      prisma.bitacoraAuditoria.findMany.mockResolvedValue([
        {
          registro_id: 50,
          accion: ACCION_ESCALADA_AUTO,
          fecha_hora: escaladaEn,
          datos_despues: {
            tipo_escalamiento: 'automatico',
            fecha_escalamiento: escaladaEn.toISOString(),
            tiempo_transcurrido_min: 16,
            responsable_original_nombre: 'Luis Operario',
            resumen_previo: 'temperatura_alta en Galpón 2',
          },
        },
      ]);

      const res = await service.listarHistorialEscalamientos({
        id: 7,
        rol: ROLES.PROPIETARIO,
      });

      expect(res.config).toEqual({
        limite_critica_min: 15,
        limite_general_min: 30,
      });
      expect(res.data).toHaveLength(1);
      expect(res.data[0]).toMatchObject({
        alerta_id: 50,
        tipo_escalamiento: 'automatico',
        responsable_original: 'Luis Operario',
        tiempo_escalamiento_min: 16,
        tiempo_respuesta_min: 25,
        estado_final: 'cerrada',
      });
    });
  });
});
