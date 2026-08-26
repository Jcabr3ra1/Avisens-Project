import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/pagination/paginate';
import { CreateInteraccionChatbotDto } from './dto/create-interaccion-chatbot.dto';
import { ListarInteraccionesDto } from './dto/listar-interacciones.dto';

const INTERACCION_SELECT = {
  id: true,
  prospecto_id: true,
  tipo: true,
  mensaje: true,
  intent_detectado: true,
  confianza_nlu: true,
  fecha_hora: true,
  prospecto: {
    select: { id: true, nombre: true, telefono: true, canal_origen: true },
  },
} as const;

@Injectable()
export class InteraccionesChatbotService {
  constructor(private prisma: PrismaService) {}

  async crear(dto: CreateInteraccionChatbotDto) {
    return this.prisma.interaccionChatbot.create({
      data: {
        prospecto_id: dto.prospecto_id,
        tipo: dto.tipo,
        mensaje: dto.mensaje,
        intent_detectado: dto.intent_detectado,
        confianza_nlu: dto.confianza_nlu,
      },
      select: INTERACCION_SELECT,
    });
  }

  async listar(dto: ListarInteraccionesDto) {
    const { page, limit, prospecto_id, desde, hasta } = dto;
    const where: Prisma.InteraccionChatbotWhereInput = {
      ...(prospecto_id ? { prospecto_id } : {}),
      ...(desde || hasta
        ? {
            fecha_hora: {
              ...(desde ? { gte: new Date(desde) } : {}),
              ...(hasta ? { lte: new Date(hasta + 'T23:59:59Z') } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.interaccionChatbot.findMany({
        where,
        select: INTERACCION_SELECT,
        orderBy: { fecha_hora: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.interaccionChatbot.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async obtener(id: number) {
    const interaccion = await this.prisma.interaccionChatbot.findUnique({
      where: { id },
      select: INTERACCION_SELECT,
    });
    if (!interaccion) throw new NotFoundException('Interacción no encontrada');
    return interaccion;
  }

  async estadisticas() {
    const [total, porTipo, confianzaProm] = await Promise.all([
      this.prisma.interaccionChatbot.count(),
      this.prisma.interaccionChatbot.groupBy({
        by: ['tipo'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      this.prisma.interaccionChatbot.aggregate({
        _avg: { confianza_nlu: true },
        where: { confianza_nlu: { not: null } },
      }),
    ]);

    return {
      total,
      confianza_promedio: confianzaProm._avg.confianza_nlu ?? 0,
      por_tipo: porTipo.map((r) => ({
        tipo: r.tipo ?? 'sin_tipo',
        cantidad: r._count.id,
      })),
    };
  }
}
