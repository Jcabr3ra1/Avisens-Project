import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/pagination/paginate';
import type { Solicitante } from '../../common/auth/acceso';
import {
  filtroGalpones,
  verificarAccesoGalpon,
} from '../../common/auth/alcance';
import {
  CreateZonaGalponDto,
  ListarZonasGalponDto,
} from './dto/create-zona-galpon.dto';
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
  galpon: {
    select: {
      id: true,
      nombre: true,
      codigo: true,
      granja: { select: { propietario_id: true } },
    },
  },
} as const;

const SIN_ACCESO = 'Solo puedes gestionar zonas de tus propios galpones';

@Injectable()
export class ZonasGalponService {
  constructor(private prisma: PrismaService) {}

  private async validarGalpon(galponId: number, solicitante: Solicitante) {
    const galpon = await this.prisma.galpon.findUnique({
      where: { id: galponId },
      select: { granja: { select: { propietario_id: true } } },
    });
    if (!galpon) throw new NotFoundException('Galpón no encontrado');
    await verificarAccesoGalpon(
      this.prisma,
      galponId,
      solicitante,
      SIN_ACCESO,
      galpon.granja.propietario_id,
    );
  }

  async crear(dto: CreateZonaGalponDto, solicitante: Solicitante) {
    await this.validarGalpon(dto.galpon_id, solicitante);
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

  async listar(
    solicitante: Solicitante,
    { page, limit, galpon_id }: ListarZonasGalponDto,
  ) {
    const galpon = filtroGalpones(solicitante);
    const where = {
      ...(galpon_id !== undefined ? { galpon_id } : {}),
      ...(galpon ? { galpon } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.zonaGalpon.findMany({
        where,
        select: ZONA_SELECT,
        orderBy: { id: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.zonaGalpon.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  async obtener(id: number, solicitante: Solicitante) {
    const zona = await this.prisma.zonaGalpon.findUnique({
      where: { id },
      select: ZONA_SELECT,
    });
    if (!zona) throw new NotFoundException(`Zona con ID ${id} no encontrada`);
    await verificarAccesoGalpon(
      this.prisma,
      zona.galpon_id,
      solicitante,
      SIN_ACCESO,
      zona.galpon.granja.propietario_id,
    );
    return zona;
  }

  async actualizar(
    id: number,
    dto: UpdateZonaGalponDto,
    solicitante: Solicitante,
  ) {
    await this.obtener(id, solicitante);
    if (dto.galpon_id !== undefined) {
      await this.validarGalpon(dto.galpon_id, solicitante);
    }
    return this.prisma.zonaGalpon.update({
      where: { id },
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
        activa: dto.activa,
      },
      select: ZONA_SELECT,
    });
  }

  async eliminar(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante);
    return this.prisma.zonaGalpon.update({
      where: { id },
      data: { activa: false },
      select: ZONA_SELECT,
    });
  }
}
