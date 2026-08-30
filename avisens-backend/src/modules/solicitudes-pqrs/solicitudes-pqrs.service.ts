import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/pagination/paginate';
import { CreateSolicitudPqrsDto } from './dto/create-solicitud-pqrs.dto';
import { ListarSolicitudesPqrsDto } from './dto/listar-solicitudes-pqrs.dto';
import { ResponderSolicitudPqrsDto } from './dto/responder-solicitud-pqrs.dto';

const SOLICITUD_SELECT = {
  id: true,
  prospecto_id: true,
  categoria: true,
  asunto: true,
  mensaje: true,
  respuesta: true,
  estado: true,
  responsable_id: true,
  fecha_creacion: true,
  fecha_cierre: true,
  prospecto: {
    select: {
      id: true,
      nombre: true,
      telefono: true,
      email: true,
      canal_origen: true,
    },
  },
  responsable: {
    select: { id: true, nombre_completo: true, email: true },
  },
} as const;

@Injectable()
export class SolicitudesPqrsService {
  constructor(private prisma: PrismaService) {}

  async crear(dto: CreateSolicitudPqrsDto) {
    return this.prisma.solicitudPqrs.create({
      data: {
        prospecto_id: dto.prospecto_id,
        categoria: dto.categoria,
        asunto: dto.asunto,
        mensaje: dto.mensaje,
        estado: 'abierta',
      },
      select: SOLICITUD_SELECT,
    });
  }

  async listar(dto: ListarSolicitudesPqrsDto) {
    const { page, limit, estado, categoria } = dto;
    const where: Prisma.SolicitudPqrsWhereInput = {
      ...(estado ? { estado } : {}),
      ...(categoria ? { categoria } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.solicitudPqrs.findMany({
        where,
        select: SOLICITUD_SELECT,
        orderBy: { fecha_creacion: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.solicitudPqrs.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async listarDeProspecto(prospectoId: number) {
    return this.prisma.solicitudPqrs.findMany({
      where: { prospecto_id: prospectoId },
      select: SOLICITUD_SELECT,
      orderBy: { fecha_creacion: 'desc' },
    });
  }

  async obtener(id: number) {
    const solicitud = await this.prisma.solicitudPqrs.findUnique({
      where: { id },
      select: SOLICITUD_SELECT,
    });
    if (!solicitud) throw new NotFoundException('Solicitud PQRS no encontrada');
    return solicitud;
  }

  async responder(id: number, dto: ResponderSolicitudPqrsDto) {
    await this.obtener(id);

    const data: Prisma.SolicitudPqrsUpdateInput = {};
    if (dto.estado) data.estado = dto.estado;
    if (dto.respuesta) data.respuesta = dto.respuesta;
    if (dto.responsable_id) {
      data.responsable = { connect: { id: dto.responsable_id } };
    }
    if (dto.estado === 'resuelta' || dto.estado === 'cerrada') {
      data.fecha_cierre = new Date();
    }

    return this.prisma.solicitudPqrs.update({
      where: { id },
      data,
      select: SOLICITUD_SELECT,
    });
  }

  async eliminar(id: number) {
    await this.obtener(id);
    await this.prisma.solicitudPqrs.delete({ where: { id } });
    return { id, eliminado: true };
  }
}
