import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/pagination/paginate';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { CreateNotificacionDto } from './dto/create-notificacion.dto';

const NOTIFICACION_SELECT = {
  id: true,
  usuario_id: true,
  tipo: true,
  titulo: true,
  mensaje: true,
  leida: true,
  referencia_tipo: true,
  referencia_id: true,
  fecha_creacion: true,
} as const;

@Injectable()
export class NotificacionesService {
  constructor(private prisma: PrismaService) {}

  async crear(dto: CreateNotificacionDto) {
    return this.prisma.notificacion.create({
      data: {
        usuario_id: dto.usuario_id,
        tipo: dto.tipo,
        titulo: dto.titulo,
        mensaje: dto.mensaje,
        referencia_tipo: dto.referencia_tipo,
        referencia_id: dto.referencia_id,
      },
      select: NOTIFICACION_SELECT,
    });
  }

  async listar(usuarioId: number, { page, limit }: PaginationQueryDto) {
    const where: Prisma.NotificacionWhereInput = { usuario_id: usuarioId };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.notificacion.findMany({
        where,
        select: NOTIFICACION_SELECT,
        orderBy: { fecha_creacion: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notificacion.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async contarNoLeidas(usuarioId: number) {
    const count = await this.prisma.notificacion.count({
      where: { usuario_id: usuarioId, leida: false },
    });
    return { no_leidas: count };
  }

  async marcarLeida(id: number, usuarioId: number) {
    const notif = await this.prisma.notificacion.findFirst({
      where: { id, usuario_id: usuarioId },
    });
    if (!notif) throw new NotFoundException('Notificación no encontrada');

    return this.prisma.notificacion.update({
      where: { id },
      data: { leida: true },
      select: NOTIFICACION_SELECT,
    });
  }

  async marcarTodasLeidas(usuarioId: number) {
    await this.prisma.notificacion.updateMany({
      where: { usuario_id: usuarioId, leida: false },
      data: { leida: true },
    });
    return { mensaje: 'Todas las notificaciones marcadas como leídas' };
  }

  async eliminar(id: number, usuarioId: number) {
    const notif = await this.prisma.notificacion.findFirst({
      where: { id, usuario_id: usuarioId },
    });
    if (!notif) throw new NotFoundException('Notificación no encontrada');

    await this.prisma.notificacion.delete({ where: { id } });
    return { id, eliminado: true };
  }
}
