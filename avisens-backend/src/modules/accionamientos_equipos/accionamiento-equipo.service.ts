// accionamientos-equipos.service.ts
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAccionamientoEquipoDto } from './dto/create-accionamientos-equipos.dto';
import { UpdateAccionamientoEquipoDto } from './dto/update-accionamientos-equipos.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';
import { esPropietario, verificarDueno } from '../../common/acceso';
import type { Solicitante } from '../../common/acceso';

const ACCIONAMIENTO_SELECT = {
  id: true,
  equipo_id: true,
  alerta_id: true,
  origen: true,
  estado: true,
  valor_disparo: true,
  usuario_id: true,
  fecha_inicio: true,
  fecha_fin: true,
  equipo: {
    select: {
      id: true,
      nombre: true,
      codigo: true,
      tipo: true,
      es_actuador: true,
      galpon_id: true,
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
  alerta: {
    select: {
      id: true,
      tipo: true,
      criticidad: true,
      mensaje: true,
    },
  },
  usuario: {
    select: {
      id: true,
      nombre_completo: true,
      email: true,
    },
  },
} as const;

@Injectable()
export class AccionamientosEquiposService {
  constructor(private prisma: PrismaService) {}

  // ============================================================
  // VALIDACIONES PRIVADAS
  // ============================================================

  private async validarEquipoActuador(equipoId: number, solicitante: Solicitante) {
    const equipo = await this.prisma.equipo.findUnique({
      where: { id: equipoId },
      include: {
        galpon: {
          include: {
            granja: true,
          },
        },
      },
    });

    if (!equipo) {
      throw new NotFoundException(`Equipo con ID ${equipoId} no encontrado`);
    }

    if (!equipo.es_actuador) {
      throw new BadRequestException(
        `El equipo "${equipo.nombre}" no es un actuador. Solo se pueden accionar actuadores.`
      );
    }

    verificarDueno(
      solicitante,
      equipo.galpon.granja.propietario_id,
      'No tienes acceso a este equipo',
    );

    return equipo;
  }

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

  private async obtenerAccionamientoConValidacion(id: number, solicitante: Solicitante) {
    const accionamiento = await this.prisma.accionamientoEquipo.findUnique({
      where: { id },
      select: ACCIONAMIENTO_SELECT,
    });

    if (!accionamiento) {
      throw new NotFoundException(`Accionamiento con ID ${id} no encontrado`);
    }

    verificarDueno(
      solicitante,
      accionamiento.equipo.galpon.granja.propietario_id,
      'No tienes acceso a este accionamiento',
    );

    return accionamiento;
  }

  private async actualizarHorasOperacionEquipo(equipoId: number, fechaInicio: Date, fechaFin: Date) {
    const horasOperacion = (fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60);
    const horasRedondeadas = Math.round(horasOperacion * 100) / 100;

    await this.prisma.equipo.update({
      where: { id: equipoId },
      data: {
        horas_operacion: {
          increment: horasRedondeadas,
        },
      },
    });

    return horasRedondeadas;
  }

  // ============================================================
  // MÉTODOS PÚBLICOS
  // ============================================================

  async crear(dto: CreateAccionamientoEquipoDto, solicitante: Solicitante) {
    await this.validarEquipoActuador(dto.equipo_id, solicitante);

    if (dto.alerta_id) {
      await this.validarAlerta(dto.alerta_id, solicitante);
    }

    const data: any = {
      equipo_id: dto.equipo_id,
      origen: dto.origen || 'automatico',
      estado: dto.estado || 'encendido',
      usuario_id: dto.origen === 'automatico' ? null : solicitante.id,
      fecha_inicio: dto.fecha_inicio ? new Date(dto.fecha_inicio) : new Date(),
    };

    if (dto.alerta_id) {
      data.alerta_id = dto.alerta_id;
    }

    if (dto.valor_disparo !== undefined) {
      data.valor_disparo = dto.valor_disparo;
    }

    return this.prisma.accionamientoEquipo.create({
      data,
      select: ACCIONAMIENTO_SELECT,
    });
  }

  async listar(solicitante: Solicitante, { page, limit }: PaginationQueryDto) {
    const where = esPropietario(solicitante)
      ? {
          equipo: {
            galpon: {
              granja: {
                propietario_id: solicitante.id,
              },
            },
          },
        }
      : {};

    const [data, total] = await this.prisma.$transaction([
      this.prisma.accionamientoEquipo.findMany({
        where,
        select: ACCIONAMIENTO_SELECT,
        orderBy: { fecha_inicio: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.accionamientoEquipo.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async obtener(id: number, solicitante: Solicitante) {
    return this.obtenerAccionamientoConValidacion(id, solicitante);
  }

  async cerrar(id: number, dto: UpdateAccionamientoEquipoDto, solicitante: Solicitante) {
    const accionamiento = await this.obtenerAccionamientoConValidacion(id, solicitante);

    if (accionamiento.fecha_fin) {
      throw new BadRequestException('Este accionamiento ya está cerrado');
    }

    const data: any = {
      fecha_fin: new Date(),
    };

    if (dto.estado) {
      data.estado = dto.estado;
    }

    const horas = await this.actualizarHorasOperacionEquipo(
      accionamiento.equipo_id,
      accionamiento.fecha_inicio,
      data.fecha_fin,
    );

    const result = await this.prisma.accionamientoEquipo.update({
      where: { id },
      data,
      select: ACCIONAMIENTO_SELECT,
    });

    return {
      ...result,
      horas_operacion_agregadas: horas,
    };
  }

  async obtenerPorEquipo(equipoId: number, solicitante: Solicitante, paginacion: PaginationQueryDto) {
    const { page, limit } = paginacion;

    await this.validarEquipoActuador(equipoId, solicitante);

    const where = { equipo_id: equipoId };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.accionamientoEquipo.findMany({
        where,
        select: ACCIONAMIENTO_SELECT,
        orderBy: { fecha_inicio: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.accionamientoEquipo.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async obtenerPorAlerta(alertaId: number, solicitante: Solicitante, paginacion: PaginationQueryDto) {
    const { page, limit } = paginacion;

    await this.validarAlerta(alertaId, solicitante);

    const where = { alerta_id: alertaId };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.accionamientoEquipo.findMany({
        where,
        select: ACCIONAMIENTO_SELECT,
        orderBy: { fecha_inicio: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.accionamientoEquipo.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async obtenerEstadisticas(solicitante: Solicitante) {
    const where = esPropietario(solicitante)
      ? {
          equipo: {
            galpon: {
              granja: {
                propietario_id: solicitante.id,
              },
            },
          },
        }
      : {};

    const [total, activos, cerrados, automaticos, manuales] = await Promise.all([
      this.prisma.accionamientoEquipo.count({ where }),
      this.prisma.accionamientoEquipo.count({ where: { ...where, fecha_fin: null } }),
      this.prisma.accionamientoEquipo.count({ where: { ...where, NOT: { fecha_fin: null } } }),
      this.prisma.accionamientoEquipo.count({ where: { ...where, origen: 'automatico' } }),
      this.prisma.accionamientoEquipo.count({ where: { ...where, origen: 'manual' } }),
    ]);

    return {
      total,
      activos,
      cerrados,
      automaticos,
      manuales,
      tasa_automatizacion: total > 0 ? (automaticos / total) * 100 : 0,
    };
  }

  async eliminar(id: number, solicitante: Solicitante) {
    await this.obtenerAccionamientoConValidacion(id, solicitante);

    await this.prisma.accionamientoEquipo.delete({
      where: { id },
    });

    return { id, eliminado: true };
  }
}