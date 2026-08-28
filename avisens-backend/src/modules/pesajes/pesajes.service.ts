import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePesajeDto } from './dto/create-pesaje.dto';
import { UpdatePesajeDto } from './dto/update-pesaje.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';
import { Solicitante } from '../../common/auth/acceso';
import {
  filtroRegistrosDeLote,
  verificarAccesoLote,
} from '../../common/auth/alcance';

const PESAJE_SELECT = {
  id: true,
  lote_id: true,
  fecha: true,
  peso_promedio_g: true,
  cantidad_aves_pesadas: true,
  peso_minimo_g: true,
  peso_maximo_g: true,
  peso_objetivo_g: true,
  alerta_generada: true,
  usuario_id: true,
  metodo_registro: true,
  observaciones: true,
  fecha_registro: true,
  lote: {
    select: {
      id: true,
      codigo: true,
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
export class PesajesService {
  constructor(private prisma: PrismaService) {}

  private async validarLote(loteId: number, solicitante: Solicitante) {
    const lote = await this.prisma.lote.findUnique({
      where: { id: loteId },
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

    if (!lote) throw new NotFoundException('Lote no encontrado');
    await verificarAccesoLote(
      this.prisma,
      loteId,
      solicitante,
      ' Solo puedes registrar pesajes de tus propios lotes',
      lote.galpon.granja.propietario_id,
    );
  }

  async crear(dto: CreatePesajeDto, solicitante: Solicitante) {
    await this.validarLote(dto.lote_id, solicitante);

    return this.prisma.pesaje.create({
      data: {
        lote_id: dto.lote_id,
        usuario_id: solicitante.id,
        fecha: new Date(dto.fecha),
        peso_promedio_g: dto.peso_promedio_g,
        cantidad_aves_pesadas: dto.cantidad_aves_pesadas,
        peso_minimo_g: dto.peso_minimo_g,
        peso_maximo_g: dto.peso_maximo_g,
        peso_objetivo_g: dto.peso_objetivo_g,
        metodo_registro: dto.metodo_registro,
        observaciones: dto.observaciones,
      },
      select: PESAJE_SELECT,
    });
  }
  async listar(solicitante: Solicitante, { page, limit }: PaginationQueryDto) {
    const where = filtroRegistrosDeLote(solicitante);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.pesaje.findMany({
        where,
        select: PESAJE_SELECT,
        orderBy: { fecha: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.pesaje.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async obtener(id: number, solicitante: Solicitante) {
    const pesaje = await this.prisma.pesaje.findUnique({
      where: { id },
      select: PESAJE_SELECT,
    });

    if (!pesaje) throw new NotFoundException('Pesaje no encontrado');
    await verificarAccesoLote(
      this.prisma,
      pesaje.lote_id,
      solicitante,
      'Solo puedes ver pesajes de tus propios lotes',
      pesaje.lote.galpon.granja.propietario_id,
    );
    return pesaje;
  }
  async actualizar(id: number, dto: UpdatePesajeDto, solicitante: Solicitante) {
    await this.obtener(id, solicitante);

    if (dto.lote_id) {
      await this.validarLote(dto.lote_id, solicitante);
    }

    return this.prisma.pesaje.update({
      where: { id },
      data: {
        lote_id: dto.lote_id,
        fecha: dto.fecha ? new Date(dto.fecha) : undefined,
        peso_promedio_g: dto.peso_promedio_g,
        cantidad_aves_pesadas: dto.cantidad_aves_pesadas,
        peso_minimo_g: dto.peso_minimo_g,
        peso_maximo_g: dto.peso_maximo_g,
        peso_objetivo_g: dto.peso_objetivo_g,
        metodo_registro: dto.metodo_registro,
        observaciones: dto.observaciones,
      },
      select: PESAJE_SELECT,
    });
  }

  async eliminar(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante);

    await this.prisma.pesaje.delete({ where: { id } });
    return { id, eliminado: true };
  }
}
