import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
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

  async listar({ page, limit }: PaginationQueryDto) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.bitacoraAuditoria.findMany({
        orderBy: { fecha_hora: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.bitacoraAuditoria.count(),
    ]);
    return paginate(data, total, page, limit);
  }
}
