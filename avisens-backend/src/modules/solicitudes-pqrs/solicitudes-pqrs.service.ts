import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/pagination/paginate';
import { CreateSolicitudPqrsDto } from './dto/create-solicitud-pqrs.dto';
import { ListarSolicitudesPqrsDto } from './dto/listar-solicitudes-pqrs.dto';
import { ResponderSolicitudPqrsDto } from './dto/responder-solicitud-pqrs.dto';
import { radicadoDe } from '../chatbot/dominio/calificacion';
import { fechaLimite, horasDeCategoria, puedeTransitar } from './dominio/pqrs';

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
  fecha_limite: true,
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

const ETIQUETA_ESTADO: Record<string, string> = {
  abierta: 'abierta',
  en_proceso: 'en proceso',
  resuelta: 'resuelta',
  cerrada: 'cerrada',
};

function conRadicado<T extends { id: number }>(solicitud: T) {
  return { ...solicitud, radicado: radicadoDe(solicitud.id) };
}

@Injectable()
export class SolicitudesPqrsService {
  constructor(private prisma: PrismaService) {}

  async crear(dto: CreateSolicitudPqrsDto) {
    const solicitud = await this.prisma.solicitudPqrs.create({
      data: {
        prospecto_id: dto.prospecto_id,
        categoria: dto.categoria,
        asunto: dto.asunto,
        mensaje: dto.mensaje,
        estado: 'abierta',
        fecha_limite: fechaLimite(new Date(), horasDeCategoria(dto.categoria)),
      },
      select: SOLICITUD_SELECT,
    });
    return conRadicado(solicitud);
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

    return paginate(data.map(conRadicado), total, page, limit);
  }

  async listarDeProspecto(prospectoId: number) {
    const solicitudes = await this.prisma.solicitudPqrs.findMany({
      where: { prospecto_id: prospectoId },
      select: SOLICITUD_SELECT,
      orderBy: { fecha_creacion: 'desc' },
    });
    return solicitudes.map(conRadicado);
  }

  async obtener(id: number) {
    const solicitud = await this.prisma.solicitudPqrs.findUnique({
      where: { id },
      select: SOLICITUD_SELECT,
    });
    if (!solicitud) throw new NotFoundException('Solicitud PQRS no encontrada');
    return conRadicado(solicitud);
  }

  async responder(id: number, dto: ResponderSolicitudPqrsDto) {
    const actual = await this.obtener(id);
    const destino = dto.estado ?? actual.estado;

    if (actual.estado === 'cerrada') {
      throw new ConflictException(
        'La solicitud está cerrada: ya no admite cambios.',
      );
    }
    if (!puedeTransitar(actual.estado, destino)) {
      throw new ConflictException(
        `Una solicitud ${ETIQUETA_ESTADO[actual.estado] ?? actual.estado} no puede pasar a ${ETIQUETA_ESTADO[destino] ?? destino}.`,
      );
    }

    const respuesta = dto.respuesta?.trim();
    if (destino === 'resuelta' && !respuesta && !actual.respuesta?.trim()) {
      throw new BadRequestException(
        'Para resolver la solicitud escribe la respuesta que se le dio al cliente.',
      );
    }

    const data: Prisma.SolicitudPqrsUpdateInput = { estado: destino };
    if (respuesta) data.respuesta = respuesta;
    if (dto.responsable_id) {
      data.responsable = { connect: { id: dto.responsable_id } };
    }
    if (destino === 'resuelta' && actual.estado !== 'resuelta') {
      data.fecha_cierre = new Date();
    }
    if (destino === 'en_proceso' && actual.estado === 'resuelta') {
      data.fecha_cierre = null;
    }

    const solicitud = await this.prisma.solicitudPqrs.update({
      where: { id },
      data,
      select: SOLICITUD_SELECT,
    });
    return conRadicado(solicitud);
  }

  async tomar(id: number, responsableId: number) {
    const actual = await this.obtener(id);
    if (actual.estado !== 'abierta' && actual.estado !== 'en_proceso') {
      throw new ConflictException(
        'Solo se puede tomar una solicitud abierta o en proceso.',
      );
    }

    const solicitud = await this.prisma.solicitudPqrs.update({
      where: { id },
      data: {
        estado: 'en_proceso',
        responsable: { connect: { id: responsableId } },
      },
      select: SOLICITUD_SELECT,
    });
    return conRadicado(solicitud);
  }

  async eliminar(id: number) {
    await this.obtener(id);
    await this.prisma.solicitudPqrs.delete({ where: { id } });
    return { id, eliminado: true };
  }
}
