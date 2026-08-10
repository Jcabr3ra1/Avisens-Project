import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTipoAlimentoDto } from './dto/create-tipo-alimento.dto';
import { UpdateTipoAlimentoDto } from './dto/update-tipo-alimento.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';

@Injectable()
export class TiposAlimentoService {
  constructor(private prisma: PrismaService) {}

  async crear(dto: CreateTipoAlimentoDto) {
    return this.prisma.tipoAlimento.create({
      data: {
        nombre: dto.nombre,
        marca: dto.marca,
        etapa: dto.etapa,
        presentacion: dto.presentacion,
        dia_inicio: dto.dia_inicio,
        dia_fin: dto.dia_fin,
        consumo_total_esperado_g: dto.consumo_total_esperado_g,
      },
    });
  }

  async listar({ page, limit }: PaginationQueryDto) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.tipoAlimento.findMany({
        orderBy: { id: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.tipoAlimento.count(),
    ]);
    return paginate(data, total, page, limit);
  }

  async obtener(id: number) {
    const tipo = await this.prisma.tipoAlimento.findUnique({ where: { id } });
    if (!tipo) throw new NotFoundException('Tipo de alimento no encontrado');
    return tipo;
  }

  async actualizar(id: number, dto: UpdateTipoAlimentoDto) {
    await this.obtener(id);
    return this.prisma.tipoAlimento.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        marca: dto.marca,
        etapa: dto.etapa,
        presentacion: dto.presentacion,
        dia_inicio: dto.dia_inicio,
        dia_fin: dto.dia_fin,
        consumo_total_esperado_g: dto.consumo_total_esperado_g,
        activo: dto.activo,
      },
    });
  }

  async desactivar(id: number) {
    await this.obtener(id);
    await this.prisma.tipoAlimento.update({
      where: { id },
      data: { activo: false },
    });
    return { id, activo: false };
  }

  async activar(id: number) {
    await this.obtener(id);
    await this.prisma.tipoAlimento.update({
      where: { id },
      data: { activo: true },
    });
    return { id, activo: true };
  }

  async eliminarPermanente(id: number) {
    await this.obtener(id);
    await this.prisma.tipoAlimento.delete({ where: { id } });
    return { id, eliminado: true };
  }
}
