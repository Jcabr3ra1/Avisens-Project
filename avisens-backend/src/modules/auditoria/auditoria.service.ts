import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryAuditoriaDto } from './dto/query-auditoria.dto';
import { paginate } from '../../common/pagination/paginate';

export interface EventoAuditoria {
  usuario_id?: number | null;
  accion: string;
  entidad_afectada: string;
  registro_id?: number | null;
  datos_despues?: unknown;
  ip_origen?: string;
  user_agent?: string;
}

@Injectable()
export class AuditoriaService {
  private readonly logger = new Logger(AuditoriaService.name);

  constructor(private prisma: PrismaService) {}

  async registrar(evento: EventoAuditoria): Promise<void> {
    try {
      await this.prisma.bitacoraAuditoria.create({
        data: {
          usuario_id: evento.usuario_id ?? null,
          accion: evento.accion,
          entidad_afectada: evento.entidad_afectada,
          registro_id: evento.registro_id ?? null,
          datos_despues:
            evento.datos_despues === undefined
              ? undefined
              : (evento.datos_despues as Prisma.InputJsonValue),
          ip_origen: evento.ip_origen,
          user_agent: evento.user_agent,
        },
      });
    } catch (error) {
      this.logger.error('No se pudo registrar la auditoria', error as Error);
    }
  }

  async listar(query: QueryAuditoriaDto) {
    const { page, limit } = query;
    const where = filtroAuditoria(query);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.bitacoraAuditoria.findMany({
        where,
        include: {
          usuario: { select: { nombre_completo: true, email: true } },
        },
        orderBy: { fecha_hora: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.bitacoraAuditoria.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  async opciones() {
    const [acciones, entidades, usuarios] = await Promise.all([
      this.prisma.bitacoraAuditoria.groupBy({
        by: ['accion'],
        _count: { _all: true },
        orderBy: { accion: 'asc' },
      }),
      this.prisma.bitacoraAuditoria.groupBy({
        by: ['entidad_afectada'],
        _count: { _all: true },
        orderBy: { entidad_afectada: 'asc' },
      }),
      this.prisma.usuario.findMany({
        where: { auditorias: { some: {} } },
        select: { id: true, nombre_completo: true },
        orderBy: { nombre_completo: 'asc' },
      }),
    ]);
    return {
      acciones: acciones.map((fila) => fila.accion),
      entidades: entidades.map((fila) => fila.entidad_afectada),
      usuarios,
    };
  }
}

const ZONA_COLOMBIA = '-05:00';

export function filtroAuditoria(
  query: QueryAuditoriaDto,
): Prisma.BitacoraAuditoriaWhereInput {
  const where: Prisma.BitacoraAuditoriaWhereInput = {};
  if (query.accion) where.accion = query.accion;
  if (query.entidad) where.entidad_afectada = query.entidad;
  if (query.usuario_id) where.usuario_id = query.usuario_id;
  if (query.desde || query.hasta) {
    where.fecha_hora = {
      ...(query.desde && {
        gte: new Date(`${query.desde}T00:00:00.000${ZONA_COLOMBIA}`),
      }),
      ...(query.hasta && {
        lte: new Date(`${query.hasta}T23:59:59.999${ZONA_COLOMBIA}`),
      }),
    };
  }
  return where;
}
