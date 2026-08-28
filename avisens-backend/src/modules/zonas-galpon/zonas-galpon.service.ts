import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/pagination/paginate';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { CreateZonaGalponDto } from './dto/create-zona-galpon.dto';
import { UpdateZonaGalponDto } from './dto/update-zona-galpon.dto';

const ZONA_SELECT = {
  id: true,
  galpon_id: true,
  codigo: true,
  nombre: true,
  tipo_zona: true,
  coordenada_x_inicio: true,
  coordenada_y_inicio: true,
  coordenada_x_fin: true,
  coordenada_y_fin: true,
  color_visualizacion: true,
  activa: true,
  galpon: { select: { id: true, nombre: true, codigo: true } },
} as const;

@Injectable()
export class ZonasGalponService {
  constructor(private prisma: PrismaService) {}

  async crear(dto: CreateZonaGalponDto) {
    return this.prisma.zonaGalpon.create({
      data: {
        galpon_id: dto.galpon_id,
        nombre: dto.nombre,
        codigo: dto.codigo,
        tipo_zona: dto.tipo_zona,
        coordenada_x_inicio: dto.coordenada_x_inicio,
        coordenada_y_inicio: dto.coordenada_y_inicio,
        coordenada_x_fin: dto.coordenada_x_fin,
        coordenada_y_fin: dto.coordenada_y_fin,
        color_visualizacion: dto.color_visualizacion,
        activa: dto.activa ?? true,
      },
      select: ZONA_SELECT,
    });
  }

  async listar({ page, limit }: PaginationQueryDto) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.zonaGalpon.findMany({
        select: ZONA_SELECT,
        orderBy: { id: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.zonaGalpon.count(),
    ]);
    return paginate(data, total, page, limit);
  }

  async obtener(id: number) {
    const zona = await this.prisma.zonaGalpon.findUnique({
      where: { id },
      select: ZONA_SELECT,
    });
    if (!zona) throw new NotFoundException(`Zona con ID ${id} no encontrada`);
    return zona;
  }

  async actualizar(id: number, dto: UpdateZonaGalponDto) {
    await this.obtener(id);
    return this.prisma.zonaGalpon.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        codigo: dto.codigo,
        tipo_zona: dto.tipo_zona,
        coordenada_x_inicio: dto.coordenada_x_inicio,
        coordenada_y_inicio: dto.coordenada_y_inicio,
        coordenada_x_fin: dto.coordenada_x_fin,
        coordenada_y_fin: dto.coordenada_y_fin,
        color_visualizacion: dto.color_visualizacion,
        activa: dto.activa,
      },
      select: ZONA_SELECT,
    });
  }

  async eliminar(id: number) {
    await this.obtener(id);
    await this.prisma.zonaGalpon.delete({ where: { id } });
    return { id, eliminado: true };
  }
}
