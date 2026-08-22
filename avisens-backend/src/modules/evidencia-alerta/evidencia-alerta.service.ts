import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEvidenciaAlertaDto } from './dto/create-evidencia-alerta.dto';
import { UpdateEvidenciaAlertaDto } from './dto/update-evidencia-alerta.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';
import {
  esPropietario,
  verificarDueno,
  type Solicitante,
} from '../../common/acceso';

const EVIDENCIA_SELECT = {
  id: true,
  alerta_id: true,
  tipo_evidencia: true,
  archivo_url: true,
  comentario: true,
  usuario_id: true,
  tamano_bytes: true,
  fecha_subida: true,
  usuario: {
    select: {
      id: true,
      nombre_completo: true,
      email: true,
    },
  },
  alerta: {
    select: {
      id: true,
      tipo: true,
      estado: true,
      galpon: {
        select: {
          granja: {
            select: {
              propietario_id: true,
            },
          },
        },
      },
    },
  },
} as const;

@Injectable()
export class EvidenciaAlertaService {
  constructor(private readonly prisma: PrismaService) {}

  private async validarAlerta(alertaId: number, solicitante: Solicitante) {
    const alerta = await this.prisma.alerta.findUnique({
      where: { id: alertaId },
      select: {
        id: true,
        galpon: {
          select: {
            granja: {
              select: {
                propietario_id: true,
              },
            },
          },
        },
      },
    });

    if (!alerta) {
      throw new NotFoundException('Alerta no encontrada');
    }

    verificarDueno(
      solicitante,
      alerta.galpon.granja.propietario_id,
      'No tienes acceso a esta alerta',
    );

    return alerta;
  }

  async crear(dto: CreateEvidenciaAlertaDto, solicitante: Solicitante) {
    await this.validarAlerta(dto.alerta_id, solicitante);

    return this.prisma.evidenciaAlerta.create({
      data: {
        alerta_id: dto.alerta_id,
        usuario_id: solicitante.id,
        tipo_evidencia: dto.tipo_evidencia,
        archivo_url: dto.archivo_url,
        comentario: dto.comentario,
        tamano_bytes: dto.tamano_bytes,
      },
      select: EVIDENCIA_SELECT,
    });
  }

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
      : undefined;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.evidenciaAlerta.findMany({
        where,
        select: EVIDENCIA_SELECT,
        orderBy: { fecha_subida: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.evidenciaAlerta.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async obtener(id: number, solicitante: Solicitante) {
    const evidencia = await this.prisma.evidenciaAlerta.findUnique({
      where: { id },
      select: EVIDENCIA_SELECT,
    });

    if (!evidencia) {
      throw new NotFoundException('Evidencia no encontrada');
    }

    verificarDueno(
      solicitante,
      evidencia.alerta.galpon.granja.propietario_id,
      'No tienes acceso a esta evidencia',
    );

    return evidencia;
  }

  async actualizar(
    id: number,
    dto: UpdateEvidenciaAlertaDto,
    solicitante: Solicitante,
  ) {
    await this.obtener(id, solicitante);

    if (dto.alerta_id !== undefined) {
      await this.validarAlerta(dto.alerta_id, solicitante);
    }

    return this.prisma.evidenciaAlerta.update({
      where: { id },
      data: {
        alerta_id: dto.alerta_id,
        tipo_evidencia: dto.tipo_evidencia,
        archivo_url: dto.archivo_url,
        comentario: dto.comentario,
        tamano_bytes: dto.tamano_bytes,
      },
      select: EVIDENCIA_SELECT,
    });
  }

  async eliminar(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante);

    await this.prisma.evidenciaAlerta.delete({
      where: { id },
    });

    return { id, eliminado: true };
  }

  async listarPorAlerta(
    alertaId: number,
    solicitante: Solicitante,
    { page, limit }: PaginationQueryDto,
  ) {
    await this.validarAlerta(alertaId, solicitante);

    const where = { alerta_id: alertaId };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.evidenciaAlerta.findMany({
        where,
        select: EVIDENCIA_SELECT,
        orderBy: { fecha_subida: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.evidenciaAlerta.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }
}
