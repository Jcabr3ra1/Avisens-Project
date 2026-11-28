import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { ROLES } from '../../common/auth/roles';
import type { Solicitante } from '../../common/auth/acceso';
import { filtroAlertas } from '../../common/auth/alcance';
import { CRITICIDADES_GRAVES } from '../../common/criticidad/criticidad';

const DEFAULT_MINUTOS_CRITICA = 15;
const DEFAULT_MINUTOS_GENERAL = 30;
const MS_POR_MINUTO = 60_000;

export const ACCION_ESCALADA_AUTO = 'ALERTA_ESCALADA_AUTO';
export const ACCION_ESCALADA_MANUAL = 'ALERTA_ESCALADA_MANUAL';

export interface AuditoriaEscalamientoData {
  tipo_escalamiento: 'automatico' | 'manual';
  fecha_escalamiento: string;
  tiempo_transcurrido_min: number;
  tiempo_limite_min: number | null;
  responsable_original_id: number | null;
  responsable_original_nombre: string;
  escalado_a_id: number;
  escalado_a_nombre: string;
  resumen_previo: string;
}

export interface EscalamientoHistorialItem {
  alerta_id: number;
  galpon: {
    id: number;
    nombre: string;
    codigo: string;
    granja: { id: number; nombre: string };
  };
  tipo: string;
  criticidad: string;
  valor_detectado: number | null;
  valor_umbral: number | null;
  estado_final: string;
  tipo_escalamiento: 'automatico' | 'manual';
  responsable_original: string;
  escalado_a: { id: number; nombre_completo: string; email: string | null } | null;
  fecha_creacion: Date;
  fecha_escalamiento: Date;
  fecha_aceptacion: Date | null;
  fecha_cierre: Date | null;
  tiempo_escalamiento_min: number;
  tiempo_respuesta_min: number | null;
  resumen_previo: string;
}

function esCriticidadGrave(criticidad: string): boolean {
  const normalizada = criticidad
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return (
    CRITICIDADES_GRAVES.includes(
      normalizada as (typeof CRITICIDADES_GRAVES)[number],
    ) || normalizada === 'critica'
  );
}

@Injectable()
export class AlertasEscalamientoService {
  private readonly logger = new Logger(AlertasEscalamientoService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly auditoria?: AuditoriaService,
    @Optional() private readonly config?: ConfigService,
  ) {}

  private leerMinutos(clave: string, defecto: number): number {
    const crudo = this.config?.get<string>(clave);
    const parsed = crudo ? Number(crudo) : NaN;
    return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : defecto;
  }

  tiempoLimiteMinutos(criticidad: string): number {
    return esCriticidadGrave(criticidad)
      ? this.leerMinutos(
          'ALERTA_ESCALAMIENTO_CRITICA_MIN',
          DEFAULT_MINUTOS_CRITICA,
        )
      : this.leerMinutos('ALERTA_ESCALAMIENTO_MIN', DEFAULT_MINUTOS_GENERAL);
  }

  async escalarAlertasVencidas(ahora: Date = new Date()): Promise<number> {
    const limiteCritica = this.leerMinutos(
      'ALERTA_ESCALAMIENTO_CRITICA_MIN',
      DEFAULT_MINUTOS_CRITICA,
    );
    const limiteGeneral = this.leerMinutos(
      'ALERTA_ESCALAMIENTO_MIN',
      DEFAULT_MINUTOS_GENERAL,
    );
    const menorLimite = Math.min(limiteCritica, limiteGeneral);
    const corteMinimo = new Date(ahora.getTime() - menorLimite * MS_POR_MINUTO);

    const candidatas = await this.prisma.alerta.findMany({
      where: {
        estado: 'abierta',
        escalado_a_id: null,
        fecha_aceptacion: null,
        fecha_creacion: { lte: corteMinimo },
      },
      select: {
        id: true,
        galpon_id: true,
        tipo: true,
        criticidad: true,
        valor_detectado: true,
        valor_umbral: true,
        mensaje: true,
        fecha_creacion: true,
        responsable: {
          select: { id: true, nombre_completo: true },
        },
        galpon: {
          select: {
            nombre: true,
            granja: {
              select: {
                propietario_id: true,
                propietario: {
                  select: { id: true, nombre_completo: true, activo: true },
                },
              },
            },
          },
        },
      },
      orderBy: { fecha_creacion: 'asc' },
      take: 100,
    });

    let escaladas = 0;

    for (const alerta of candidatas) {
      const limiteMin = this.tiempoLimiteMinutos(alerta.criticidad);
      const transcurridoMin = Math.floor(
        (ahora.getTime() - alerta.fecha_creacion.getTime()) / MS_POR_MINUTO,
      );
      if (transcurridoMin < limiteMin) continue;

      const propietario = alerta.galpon.granja.propietario;
      if (!propietario || !propietario.activo) continue;

      const operarios = await this.prisma.usuarioGalpon.findMany({
        where: {
          galpon_id: alerta.galpon_id,
          activa: true,
          usuario: { activo: true, rol: { nombre: ROLES.OPERARIO } },
        },
        select: {
          usuario: { select: { id: true, nombre_completo: true } },
        },
        orderBy: { usuario_id: 'asc' },
      });

      const responsableOriginalId =
        alerta.responsable?.id ?? operarios[0]?.usuario.id ?? null;
      const responsableOriginalNombre =
        alerta.responsable?.nombre_completo ??
        (operarios.length > 0
          ? operarios.map((o) => o.usuario.nombre_completo).join(', ')
          : 'Sin operario asignado');

      const actualizado = await this.prisma.alerta.updateMany({
        where: {
          id: alerta.id,
          estado: 'abierta',
          escalado_a_id: null,
        },
        data: {
          escalado_a_id: propietario.id,
          estado: 'en_proceso',
        },
      });

      if (actualizado.count === 0) continue;

      const lecturaDetalle =
        alerta.valor_detectado !== null && alerta.valor_umbral !== null
          ? ` (lectura: ${alerta.valor_detectado}, límite: ${alerta.valor_umbral})`
          : '';
      const resumenPrevio =
        `${alerta.tipo} en ${alerta.galpon.nombre}${lecturaDetalle}. ` +
        `${alerta.mensaje ?? 'Alerta sin atención.'}`;

      const mensajeNotificacion =
        `Sin atención tras ${transcurridoMin} min (límite ${limiteMin} min). ` +
        `Responsable original: ${responsableOriginalNombre}. ` +
        `Evento: ${resumenPrevio}`;

      await this.prisma.notificacion.create({
        data: {
          usuario_id: propietario.id,
          tipo: 'alerta_escalada',
          titulo: `Alerta escalada automáticamente · ${alerta.galpon.nombre}`,
          mensaje: mensajeNotificacion,
          referencia_tipo: 'alerta',
          referencia_id: alerta.id,
        },
      });

      const datosAuditoria: AuditoriaEscalamientoData = {
        tipo_escalamiento: 'automatico',
        fecha_escalamiento: ahora.toISOString(),
        tiempo_transcurrido_min: transcurridoMin,
        tiempo_limite_min: limiteMin,
        responsable_original_id: responsableOriginalId,
        responsable_original_nombre: responsableOriginalNombre,
        escalado_a_id: propietario.id,
        escalado_a_nombre: propietario.nombre_completo,
        resumen_previo: resumenPrevio,
      };

      await this.auditoria?.registrar({
        usuario_id: responsableOriginalId,
        accion: ACCION_ESCALADA_AUTO,
        entidad_afectada: 'alertas',
        registro_id: alerta.id,
        datos_despues: datosAuditoria,
      });

      escaladas += 1;
    }

    if (escaladas > 0) {
      this.logger.log(
        JSON.stringify({
          evento: 'alertas.escalamiento.automatico',
          escaladas,
        }),
      );
    }

    return escaladas;
  }

  async registrarEscalamientoManual(
    alerta: {
      id: number;
      tipo: string;
      valor_detectado: number | null;
      valor_umbral: number | null;
      mensaje: string | null;
      fecha_creacion: Date;
      galpon: { nombre: string };
      responsable: { id: number; nombre_completo: string } | null;
      escalado_a: { id: number; nombre_completo: string } | null;
    },
    solicitante: Solicitante,
  ): Promise<void> {
    const ahora = new Date();
    const transcurridoMin = Math.max(
      0,
      Math.floor(
        (ahora.getTime() - alerta.fecha_creacion.getTime()) / MS_POR_MINUTO,
      ),
    );
    const responsableNombre =
      alerta.responsable?.nombre_completo ?? 'Sin asignar';
    const escaladoNombre =
      alerta.escalado_a?.nombre_completo ?? 'Usuario asignado';
    const resumenPrevio = `${alerta.tipo} en ${alerta.galpon.nombre}. ${
      alerta.mensaje ?? ''
    }`.trim();

    if (alerta.escalado_a && alerta.escalado_a.id !== solicitante.id) {
      await this.prisma.notificacion.create({
        data: {
          usuario_id: alerta.escalado_a.id,
          tipo: 'alerta_escalada',
          titulo: `Alerta escalada · ${alerta.galpon.nombre}`,
          mensaje: `Se te escaló la alerta (${resumenPrevio}) tras ${transcurridoMin} min. Responsable previo: ${responsableNombre}.`,
          referencia_tipo: 'alerta',
          referencia_id: alerta.id,
        },
      });
    }

    const datosAuditoria: AuditoriaEscalamientoData = {
      tipo_escalamiento: 'manual',
      fecha_escalamiento: ahora.toISOString(),
      tiempo_transcurrido_min: transcurridoMin,
      tiempo_limite_min: null,
      responsable_original_id: alerta.responsable?.id ?? solicitante.id,
      responsable_original_nombre: responsableNombre,
      escalado_a_id: alerta.escalado_a?.id ?? 0,
      escalado_a_nombre: escaladoNombre,
      resumen_previo: resumenPrevio,
    };

    await this.auditoria?.registrar({
      usuario_id: solicitante.id,
      accion: ACCION_ESCALADA_MANUAL,
      entidad_afectada: 'alertas',
      registro_id: alerta.id,
      datos_despues: datosAuditoria,
    });
  }

  async listarHistorialEscalamientos(
    solicitante: Solicitante,
  ): Promise<{
    config: { limite_critica_min: number; limite_general_min: number };
    data: EscalamientoHistorialItem[];
  }> {
    const where: Record<string, unknown> = {
      ...(filtroAlertas(solicitante) ?? {}),
      escalado_a_id: { not: null },
    };

    const alertas = await this.prisma.alerta.findMany({
      where,
      select: {
        id: true,
        tipo: true,
        criticidad: true,
        valor_detectado: true,
        valor_umbral: true,
        mensaje: true,
        estado: true,
        fecha_creacion: true,
        fecha_aceptacion: true,
        fecha_cierre: true,
        galpon: {
          select: {
            id: true,
            nombre: true,
            codigo: true,
            granja: { select: { id: true, nombre: true } },
          },
        },
        responsable: {
          select: { id: true, nombre_completo: true },
        },
        escalado_a: {
          select: { id: true, nombre_completo: true, email: true },
        },
      },
      orderBy: { fecha_creacion: 'desc' },
      take: 200,
    });

    const ids = alertas.map((a) => a.id);
    const auditorias =
      ids.length > 0
        ? await this.prisma.bitacoraAuditoria.findMany({
            where: {
              entidad_afectada: 'alertas',
              accion: { in: [ACCION_ESCALADA_AUTO, ACCION_ESCALADA_MANUAL] },
              registro_id: { in: ids },
            },
            select: {
              registro_id: true,
              accion: true,
              fecha_hora: true,
              datos_despues: true,
            },
            orderBy: { fecha_hora: 'desc' },
          })
        : [];

    const auditoriaPorAlerta = new Map<
      number,
      {
        accion: string;
        fecha_hora: Date;
        datos: Partial<AuditoriaEscalamientoData>;
      }
    >();

    for (const item of auditorias) {
      if (item.registro_id === null || auditoriaPorAlerta.has(item.registro_id))
        continue;
      const datos =
        item.datos_despues && typeof item.datos_despues === 'object'
          ? (item.datos_despues as Partial<AuditoriaEscalamientoData>)
          : {};
      auditoriaPorAlerta.set(item.registro_id, {
        accion: item.accion,
        fecha_hora: item.fecha_hora,
        datos,
      });
    }

    const data: EscalamientoHistorialItem[] = alertas.map((alerta) => {
      const reg = auditoriaPorAlerta.get(alerta.id);
      const tipoEscalamiento: 'automatico' | 'manual' =
        reg?.accion === ACCION_ESCALADA_AUTO ||
        reg?.datos.tipo_escalamiento === 'automatico'
          ? 'automatico'
          : 'manual';
      const fechaEscalamiento = reg?.datos.fecha_escalamiento
        ? new Date(reg.datos.fecha_escalamiento)
        : (reg?.fecha_hora ?? alerta.fecha_creacion);
      const tiempoEscalamientoMin =
        typeof reg?.datos.tiempo_transcurrido_min === 'number'
          ? reg.datos.tiempo_transcurrido_min
          : Math.max(
              0,
              Math.floor(
                (fechaEscalamiento.getTime() - alerta.fecha_creacion.getTime()) /
                  MS_POR_MINUTO,
              ),
            );
      const finAtencion = alerta.fecha_cierre ?? alerta.fecha_aceptacion;
      const tiempoRespuestaMin = finAtencion
        ? Math.max(
            0,
            Math.floor(
              (finAtencion.getTime() - alerta.fecha_creacion.getTime()) /
                MS_POR_MINUTO,
            ),
          )
        : null;

      return {
        alerta_id: alerta.id,
        galpon: alerta.galpon,
        tipo: alerta.tipo,
        criticidad: alerta.criticidad,
        valor_detectado: alerta.valor_detectado,
        valor_umbral: alerta.valor_umbral,
        estado_final: alerta.estado,
        tipo_escalamiento: tipoEscalamiento,
        responsable_original:
          reg?.datos.responsable_original_nombre ??
          alerta.responsable?.nombre_completo ??
          'Sin asignar',
        escalado_a: alerta.escalado_a,
        fecha_creacion: alerta.fecha_creacion,
        fecha_escalamiento: fechaEscalamiento,
        fecha_aceptacion: alerta.fecha_aceptacion,
        fecha_cierre: alerta.fecha_cierre,
        tiempo_escalamiento_min: tiempoEscalamientoMin,
        tiempo_respuesta_min: tiempoRespuestaMin,
        resumen_previo:
          reg?.datos.resumen_previo ??
          alerta.mensaje ??
          `${alerta.tipo} en ${alerta.galpon.nombre}`,
      };
    });

    return {
      config: {
        limite_critica_min: this.leerMinutos(
          'ALERTA_ESCALAMIENTO_CRITICA_MIN',
          DEFAULT_MINUTOS_CRITICA,
        ),
        limite_general_min: this.leerMinutos(
          'ALERTA_ESCALAMIENTO_MIN',
          DEFAULT_MINUTOS_GENERAL,
        ),
      },
      data,
    };
  }
}
