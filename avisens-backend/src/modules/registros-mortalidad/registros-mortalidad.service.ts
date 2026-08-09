import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRegistroMortalidadDto } from './dto/create-registro-mortalidad.dto';
import { UpdateRegistroMortalidadDto } from './dto/update-registro-mortalidad.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';
import {
  esPropietario,
  verificarDueno,
  Solicitante,
} from '../../common/acceso';

const MORTALIDAD_SELECT = {
  id: true,
  lote_id: true,
  fecha: true,
  cantidad_aves: true,
  causa_presuntiva: true,
  disposicion: true,
  alerta_generada: true,
  usuario_id: true,
  metodo_registro: true,
  observaciones: true,
  fecha_registro: true,
  lote: {
    select: {
      id: true,
      codigo: true,
      galpon: { select: { granja: { select: { propietario_id: true } } } },
    },
  },
} as const;

@Injectable()
export class RegistrosMortalidadService {
  constructor(private prisma: PrismaService) {}

  private async validarLote(loteId: number, solicitante: Solicitante) {
    const lote = await this.prisma.lote.findUnique({
      where: { id: loteId },
      select: {
        id: true,
        galpon: { select: { granja: { select: { propietario_id: true } } } },
      },
    });

    if (!lote) throw new NotFoundException('Lote no encontrado');
    verificarDueno(
      solicitante,
      lote.galpon.granja.propietario_id,
      'Solo puedes registrar mortalidad de tus propios lotes',
    );
  }

  async crear(dto: CreateRegistroMortalidadDto, solicitante: Solicitante) {
    await this.validarLote(dto.lote_id, solicitante);

    return this.prisma.registroMortalidad.create({
      data: {
        lote_id: dto.lote_id,
        usuario_id: solicitante.id,
        fecha: new Date(dto.fecha),
        cantidad_aves: dto.cantidad_aves,
        causa_presuntiva: dto.causa_presuntiva,
        disposicion: dto.disposicion,
        metodo_registro: dto.metodo_registro,
        observaciones: dto.observaciones,
      },
      select: MORTALIDAD_SELECT,
    });
  }

  async listar(solicitante: Solicitante, { page, limit }: PaginationQueryDto) {
    const where = esPropietario(solicitante)
      ? { lote: { galpon: { granja: { propietario_id: solicitante.id } } } }
      : undefined;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.registroMortalidad.findMany({
        where,
        select: MORTALIDAD_SELECT,
        orderBy: { fecha: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.registroMortalidad.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async obtener(id: number, solicitante: Solicitante) {
    const registro = await this.prisma.registroMortalidad.findUnique({
      where: { id },
      select: MORTALIDAD_SELECT,
    });

    if (!registro)
      throw new NotFoundException('Registro de mortalidad no encontrado');
    verificarDueno(
      solicitante,
      registro.lote.galpon.granja.propietario_id,
      'Solo puedes ver mortalidad de tus propios lotes',
    );
    return registro;
  }

  async actualizar(
    id: number,
    dto: UpdateRegistroMortalidadDto,
    solicitante: Solicitante,
  ) {
    await this.obtener(id, solicitante);

    if (dto.lote_id) {
      await this.validarLote(dto.lote_id, solicitante);
    }

    return this.prisma.registroMortalidad.update({
      where: { id },
      data: {
        lote_id: dto.lote_id,
        fecha: dto.fecha ? new Date(dto.fecha) : undefined,
        cantidad_aves: dto.cantidad_aves,
        causa_presuntiva: dto.causa_presuntiva,
        disposicion: dto.disposicion,
        metodo_registro: dto.metodo_registro,
        observaciones: dto.observaciones,
      },
      select: MORTALIDAD_SELECT,
    });
  }

  async eliminar(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante);

    await this.prisma.registroMortalidad.delete({ where: { id } });
    return { id, eliminado: true };
  }
}
