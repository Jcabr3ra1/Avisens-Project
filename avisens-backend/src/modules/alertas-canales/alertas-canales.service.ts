// alertas-canales.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
// REVISION (Juan): tras renombrar los DTOs a ".dto.ts", cambiar estos imports a
// './dto/create-alertas-canales.dto' y './dto/update-alertas-canales.dto'.
import { CreateAlertasCanalesDto } from './dto/create-alertas-canales.dto';
import { UpdateAlertasCanalesDto } from './dto/update-alertas-canales.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';
import { esPropietario, verificarDueno } from '../../common/acceso';
import type { Solicitante } from '../../common/acceso';

const ALERTA_CANAL_SELECT = {
  id: true,
  alerta_id: true,
  canal: true,
  estado_envio: true,
  fecha_envio: true,
  alerta: {
    select: {
      id: true,
      tipo: true,
      criticidad: true,
      mensaje: true,
      estado: true,
      galpon: {
        select: {
          id: true,
          nombre: true,
          granja: {
            select: {
              id: true,
              nombre: true,
              propietario_id: true,
            },
          },
        },
      },
    },
  },
} as const;

@Injectable()
export class AlertasCanalesService {
  constructor(private prisma: PrismaService) {}

  // ============================================================
  // VALIDACIONES PRIVADAS
  // ============================================================

  private async validarAlerta(alertaId: number, solicitante: Solicitante) {
    const alerta = await this.prisma.alerta.findUnique({
      where: { id: alertaId },
      include: {
        galpon: {
          include: {
            granja: true,
          },
        },
      },
    });

    if (!alerta) {
      throw new NotFoundException(`Alerta con ID ${alertaId} no encontrada`);
    }

    verificarDueno(
      solicitante,
      alerta.galpon.granja.propietario_id,
      'No tienes acceso a esta alerta',
    );

    return alerta;
  }

  private async validarCanalUnico(alertaId: number, canal: string) {
    const existente = await this.prisma.alertaCanal.findFirst({
      where: {
        alerta_id: alertaId,
        canal: canal,
      },
    });

    if (existente) {
      throw new ForbiddenException(
        `Ya existe un registro para el canal "${canal}" en esta alerta`,
      );
    }
  }

  private async obtenerCanalConValidacion(
    id: number,
    solicitante: Solicitante,
  ) {
    const alertaCanal = await this.prisma.alertaCanal.findUnique({
      where: { id },
      select: ALERTA_CANAL_SELECT,
    });

    if (!alertaCanal) {
      throw new NotFoundException(`Canal de alerta con ID ${id} no encontrado`);
    }

    verificarDueno(
      solicitante,
      alertaCanal.alerta.galpon.granja.propietario_id,
      'No tienes acceso a este registro',
    );

    return alertaCanal;
  }

  // ============================================================
  // MÉTODOS PÚBLICOS
  // ============================================================

  /**
   * CREAR REGISTRO DE CANAL PARA ALERTA
   */
  async crear(dto: CreateAlertasCanalesDto, solicitante: Solicitante) {
    // Validar que la alerta existe y el usuario tiene acceso
    await this.validarAlerta(dto.alerta_id, solicitante);

    // Validar que no exista ya un registro para este canal
    if (dto.canal) {
      await this.validarCanalUnico(dto.alerta_id, dto.canal);
    }

    // ✅ Construir data con tipado explícito
    const data: {
      alerta_id: number;
      canal?: string;
      estado_envio: string;
      fecha_envio?: Date;
    } = {
      alerta_id: dto.alerta_id,
      estado_envio: dto.estado_envio || 'pendiente',
    };

    // Agregar campos opcionales solo si existen
    if (dto.canal) {
      data.canal = dto.canal;
    }

    if (dto.fecha_envio) {
      data.fecha_envio = new Date(dto.fecha_envio);
    }

    return this.prisma.alertaCanal.create({
      data,
      select: ALERTA_CANAL_SELECT,
    });
  }

  /**
   * LISTAR CANALES DE ALERTAS CON PAGINACIÓN
   */
  async listar(solicitante: Solicitante, { page, limit }: PaginationQueryDto) {
    const where = esPropietario(solicitante)
      ? {
          alerta: {
            galpon: {
              granja: {
                propietario_id: solicitante.id,
              },
            },
          },
        }
      : {};

    const [data, total] = await this.prisma.$transaction([
      this.prisma.alertaCanal.findMany({
        where,
        select: ALERTA_CANAL_SELECT,
        orderBy: { id: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.alertaCanal.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  /**
   * OBTENER CANAL DE ALERTA POR ID
   */
  async obtener(id: number, solicitante: Solicitante) {
    return this.obtenerCanalConValidacion(id, solicitante);
  }

  /**
   * ACTUALIZAR CANAL DE ALERTA
   */
  async actualizar(
    id: number,
    dto: UpdateAlertasCanalesDto,
    solicitante: Solicitante,
  ) {
    // Verificar que existe y el usuario tiene acceso
    await this.obtenerCanalConValidacion(id, solicitante);

    // ✅ Construir data con tipado explícito
    const data: {
      estado_envio?: string;
      fecha_envio?: Date | null;
    } = {};

    if (dto.estado_envio !== undefined) {
      data.estado_envio = dto.estado_envio;
    }

    if (dto.fecha_envio !== undefined) {
      data.fecha_envio = dto.fecha_envio ? new Date(dto.fecha_envio) : null;
    }

    // Si no hay datos para actualizar, retornar el registro actual
    if (Object.keys(data).length === 0) {
      return this.obtenerCanalConValidacion(id, solicitante);
    }

    return this.prisma.alertaCanal.update({
      where: { id },
      data,
      select: ALERTA_CANAL_SELECT,
    });
  }

  /**
   * ACTUALIZAR ESTADO DE ENVÍO
   */
  async actualizarEstadoEnvio(
    id: number,
    estado: string,
    solicitante: Solicitante,
  ) {
    await this.obtenerCanalConValidacion(id, solicitante);

    const data: {
      estado_envio: string;
      fecha_envio?: Date;
    } = {
      estado_envio: estado,
    };

    if (estado === 'enviado') {
      data.fecha_envio = new Date();
    }

    return this.prisma.alertaCanal.update({
      where: { id },
      data,
      select: ALERTA_CANAL_SELECT,
    });
  }

  /**
   * MARCAR COMO ENVIADO
   */
  async marcarComoEnviado(id: number, solicitante: Solicitante) {
    await this.obtenerCanalConValidacion(id, solicitante);

    const data = {
      estado_envio: 'enviado',
      fecha_envio: new Date(),
    };

    return this.prisma.alertaCanal.update({
      where: { id },
      data,
      select: ALERTA_CANAL_SELECT,
    });
  }

  /**
   * MARCAR COMO FALLIDO
   */
  async marcarComoFallido(id: number, solicitante: Solicitante) {
    await this.obtenerCanalConValidacion(id, solicitante);

    const data = {
      estado_envio: 'fallido',
    };

    return this.prisma.alertaCanal.update({
      where: { id },
      data,
      select: ALERTA_CANAL_SELECT,
    });
  }

  /**
   * OBTENER CANALES POR ALERTA
   */
  async obtenerPorAlerta(
    alertaId: number,
    solicitante: Solicitante,
    paginacion: PaginationQueryDto,
  ) {
    const { page, limit } = paginacion;

    // Validar acceso a la alerta
    await this.validarAlerta(alertaId, solicitante);

    const where = { alerta_id: alertaId };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.alertaCanal.findMany({
        where,
        select: ALERTA_CANAL_SELECT,
        orderBy: { id: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.alertaCanal.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  /**
   * ELIMINAR REGISTRO DE CANAL DE ALERTA
   */
  async eliminar(id: number, solicitante: Solicitante) {
    await this.obtenerCanalConValidacion(id, solicitante);

    await this.prisma.alertaCanal.delete({
      where: { id },
    });

    return { id, eliminado: true };
  }

  /**
   * ELIMINAR TODOS LOS CANALES DE UNA ALERTA
   */
  async eliminarPorAlerta(alertaId: number, solicitante: Solicitante) {
    await this.validarAlerta(alertaId, solicitante);

    const result = await this.prisma.alertaCanal.deleteMany({
      where: { alerta_id: alertaId },
    });

    return {
      alerta_id: alertaId,
      eliminados: result.count,
    };
  }

  /**
   * OBTENER ESTADÍSTICAS DE CANALES
   */
  async obtenerEstadisticas(solicitante: Solicitante) {
    const where = esPropietario(solicitante)
      ? {
          alerta: {
            galpon: {
              granja: {
                propietario_id: solicitante.id,
              },
            },
          },
        }
      : {};

    const [total, enviados, pendientes, fallidos] = await Promise.all([
      this.prisma.alertaCanal.count({ where }),
      this.prisma.alertaCanal.count({
        where: { ...where, estado_envio: 'enviado' },
      }),
      this.prisma.alertaCanal.count({
        where: { ...where, estado_envio: 'pendiente' },
      }),
      this.prisma.alertaCanal.count({
        where: { ...where, estado_envio: 'fallido' },
      }),
    ]);

    return {
      total,
      enviados,
      pendientes,
      fallidos,
      tasa_exito: total > 0 ? (enviados / total) * 100 : 0,
    };
  }
}
