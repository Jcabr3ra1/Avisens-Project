import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRegistroPlagaDto } from './dto/create-registro-plaga.dto';
import { UpdateRegistroPlagaDto } from './dto/update-registro-plaga.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';
import { Solicitante } from '../../common/auth/acceso';
import {
  filtroRegistrosDeLote,
  verificarAccesoLote,
} from '../../common/auth/alcance';

const PLAGA_SELECT = {
  id: true,
  lote_id: true,
  insumo_id: true,
  usuario_id: true,
  fecha: true,
  tipo_plaga: true,
  descripcion: true,
  control_aplicado: true,
  metodo_registro: true,
  observaciones: true,
  fecha_registro: true,
  lote: {
    select: {
      id: true,
      codigo: true,
      galpon: {
        select: { granja: { select: { id: true, propietario_id: true } } },
      },
    },
  },
  insumo: { select: { id: true, nombre: true } },
} as const;

@Injectable()
export class RegistrosPlagasService {
  constructor(private prisma: PrismaService) {}

  private async validarLote(loteId: number, solicitante: Solicitante) {
    const lote = await this.prisma.lote.findUnique({
      where: { id: loteId },
      select: {
        id: true,
        galpon: {
          select: { granja: { select: { id: true, propietario_id: true } } },
        },
      },
    });

    if (!lote) throw new NotFoundException('Lote no encontrado');
    await verificarAccesoLote(
      this.prisma,
      loteId,
      solicitante,
      'Solo puedes registrar plagas de tus propios lotes',
      lote.galpon.granja.propietario_id,
    );
    return lote.galpon.granja.id;
  }

  private async validarInsumo(insumoId: number, granjaId: number) {
    const insumo = await this.prisma.inventarioInsumo.findFirst({
      where: { id: insumoId, granja_id: granjaId, activo: true },
      select: { id: true },
    });

    if (!insumo) {
      throw new NotFoundException(
        'Insumo no encontrado, inactivo o perteneciente a otra granja',
      );
    }
  }

  async crear(dto: CreateRegistroPlagaDto, solicitante: Solicitante) {
    const granjaId = await this.validarLote(dto.lote_id, solicitante);
    if (dto.insumo_id) {
      await this.validarInsumo(dto.insumo_id, granjaId);
    }

    return this.prisma.registroPlaga.create({
      data: {
        lote_id: dto.lote_id,
        insumo_id: dto.insumo_id,
        usuario_id: solicitante.id,
        fecha: new Date(dto.fecha),
        tipo_plaga: dto.tipo_plaga,
        descripcion: dto.descripcion,
        control_aplicado: dto.control_aplicado,
        metodo_registro: dto.metodo_registro,
        observaciones: dto.observaciones,
      },
      select: PLAGA_SELECT,
    });
  }

  async listar(solicitante: Solicitante, { page, limit }: PaginationQueryDto) {
    const where = filtroRegistrosDeLote(solicitante);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.registroPlaga.findMany({
        where,
        select: PLAGA_SELECT,
        orderBy: { fecha: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.registroPlaga.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async obtener(id: number, solicitante: Solicitante) {
    const registro = await this.prisma.registroPlaga.findUnique({
      where: { id },
      select: PLAGA_SELECT,
    });

    if (!registro)
      throw new NotFoundException('Registro de plaga no encontrado');
    await verificarAccesoLote(
      this.prisma,
      registro.lote_id,
      solicitante,
      'Solo puedes ver plagas de tus propios lotes',
      registro.lote.galpon.granja.propietario_id,
    );
    return registro;
  }

  async actualizar(
    id: number,
    dto: UpdateRegistroPlagaDto,
    solicitante: Solicitante,
  ) {
    const actual = await this.obtener(id, solicitante);
    const granjaId = await this.validarLote(
      dto.lote_id ?? actual.lote_id,
      solicitante,
    );
    if (dto.insumo_id) {
      await this.validarInsumo(dto.insumo_id, granjaId);
    }

    return this.prisma.registroPlaga.update({
      where: { id },
      data: {
        lote_id: dto.lote_id,
        insumo_id: dto.insumo_id,
        fecha: dto.fecha ? new Date(dto.fecha) : undefined,
        tipo_plaga: dto.tipo_plaga,
        descripcion: dto.descripcion,
        control_aplicado: dto.control_aplicado,
        metodo_registro: dto.metodo_registro,
        observaciones: dto.observaciones,
      },
      select: PLAGA_SELECT,
    });
  }

  async eliminar(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante);

    await this.prisma.registroPlaga.delete({ where: { id } });
    return { id, eliminado: true };
  }
}
