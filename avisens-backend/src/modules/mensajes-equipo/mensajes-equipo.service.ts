import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/pagination/paginate';
import { filtroGalpones, verificarAccesoGalpon } from '../../common/auth/alcance';
import type { Solicitante } from '../../common/auth/acceso';
import { EnviarMensajeDto } from './dto/enviar-mensaje.dto';
import { ListarMensajesDto } from './dto/listar-mensajes.dto';

const SIN_ACCESO = 'No tienes acceso a las conversaciones de ese galpón';

const MENSAJE_SELECT = {
  id: true,
  galpon_id: true,
  emisor_id: true,
  contenido: true,
  fecha_envio: true,
  fecha_lectura: true,
  emisor: {
    select: { id: true, nombre_completo: true },
  },
} as const;

@Injectable()
export class MensajesEquipoService {
  constructor(private prisma: PrismaService) {}

  async enviar(dto: EnviarMensajeDto, solicitante: Solicitante) {
    await verificarAccesoGalpon(
      this.prisma,
      dto.galpon_id,
      solicitante,
      SIN_ACCESO,
    );

    return this.prisma.mensajeEquipo.create({
      data: {
        galpon_id: dto.galpon_id,
        // El emisor sale del token, nunca del cuerpo: si viniera del cliente,
        // cualquiera podria escribir haciendose pasar por otro.
        emisor_id: solicitante.id,
        contenido: dto.contenido.trim(),
      },
      select: MENSAJE_SELECT,
    });
  }

  async listarDeGalpon(
    galponId: number,
    solicitante: Solicitante,
    { page, limit, sin_leer }: ListarMensajesDto,
  ) {
    await verificarAccesoGalpon(this.prisma, galponId, solicitante, SIN_ACCESO);

    const where: Prisma.MensajeEquipoWhereInput = {
      galpon_id: galponId,
      ...(sin_leer ? { fecha_lectura: null } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.mensajeEquipo.findMany({
        where,
        select: MENSAJE_SELECT,
        // Del mas reciente al mas antiguo: un chat se lee por el final.
        orderBy: { fecha_envio: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.mensajeEquipo.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  /**
   * Los galpones con conversacion, y cuantos mensajes sin leer tiene cada uno.
   *
   * Es lo que necesita la lista de la pantalla: sin esto habria que pedir los
   * mensajes de cada galpon por separado para saber cuales tienen algo nuevo.
   */
  async resumen(solicitante: Solicitante) {
    const galpon = filtroGalpones(solicitante);

    const grupos = await this.prisma.mensajeEquipo.groupBy({
      by: ['galpon_id'],
      where: galpon ? { galpon } : undefined,
      _count: { _all: true },
      _max: { fecha_envio: true },
      orderBy: { galpon_id: 'asc' },
    });
    if (!grupos.length) return [];

    const ids = grupos.map((g) => g.galpon_id);
    const [galpones, sinLeer] = await Promise.all([
      this.prisma.galpon.findMany({
        where: { id: { in: ids } },
        select: { id: true, nombre: true, codigo: true },
      }),
      this.prisma.mensajeEquipo.groupBy({
        by: ['galpon_id'],
        where: { galpon_id: { in: ids }, fecha_lectura: null },
        _count: { _all: true },
        orderBy: { galpon_id: 'asc' },
      }),
    ]);

    const nombrePorId = new Map(galpones.map((g) => [g.id, g]));
    const sinLeerPorId = new Map(
      sinLeer.map((s) => [s.galpon_id, s._count._all]),
    );

    return grupos
      .map((g) => ({
        galpon_id: g.galpon_id,
        galpon: nombrePorId.get(g.galpon_id) ?? null,
        total: g._count._all,
        sin_leer: sinLeerPorId.get(g.galpon_id) ?? 0,
        ultimo_mensaje: g._max.fecha_envio,
      }))
      .sort(
        (a, b) =>
          (b.ultimo_mensaje?.getTime() ?? 0) - (a.ultimo_mensaje?.getTime() ?? 0),
      );
  }

  async marcarLeidos(galponId: number, solicitante: Solicitante) {
    await verificarAccesoGalpon(this.prisma, galponId, solicitante, SIN_ACCESO);

    // Los propios no se marcan: leer lo que uno mismo escribio no significa
    // nada, y contarlos inflaria el "sin leer" de quien mas participa.
    const { count } = await this.prisma.mensajeEquipo.updateMany({
      where: {
        galpon_id: galponId,
        fecha_lectura: null,
        emisor_id: { not: solicitante.id },
      },
      data: { fecha_lectura: new Date() },
    });

    return { galpon_id: galponId, marcados: count };
  }

  async eliminar(id: number, solicitante: Solicitante) {
    const mensaje = await this.prisma.mensajeEquipo.findUnique({
      where: { id },
      select: { id: true, emisor_id: true, galpon_id: true },
    });
    if (!mensaje) throw new NotFoundException('Mensaje no encontrado');

    // Solo se borra lo propio. Que alguien pueda borrar lo que dijo otro
    // convierte la conversacion en algo que no se puede usar como registro.
    if (mensaje.emisor_id !== solicitante.id) {
      throw new ForbiddenException('Solo puedes borrar tus propios mensajes');
    }

    await this.prisma.mensajeEquipo.delete({ where: { id } });
    return { id, eliminado: true };
  }
}
