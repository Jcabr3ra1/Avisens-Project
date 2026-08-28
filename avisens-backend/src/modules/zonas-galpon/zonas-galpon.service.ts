// zonas-galpon.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateZonaGalponDto } from './dto/create-zona-galpon.dto';
import { UpdateZonaGalponDto } from './dto/update-zona-galpon.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';
import { esPropietario, verificarDueno } from '../../common/auth/acceso';
import type { Solicitante } from '../../common/auth/acceso';

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
      granja: {
        select: {
          id: true,
          nombre: true,
          propietario_id: true,
        },
      },
    },
  },
  sensores: {
    select: {
      id: true,
      codigo: true,
      tipo: true,
    },
  },
  equipos: {
    select: {
      id: true,
      nombre: true,
      codigo: true,
      tipo: true,
    },
  },
} as const;

@Injectable()
export class ZonasGalponService {
  constructor(private prisma: PrismaService) {}

  // ============================================================
  // VALIDACIONES PRIVADAS
  // ============================================================

  private async validarGalpon(galponId: number, solicitante: Solicitante) {
    const galpon = await this.prisma.galpon.findUnique({
      where: { id: galponId },
      include: {
        granja: true,
      },
    });

    if (!galpon) {
      throw new NotFoundException(`Galpón con ID ${galponId} no encontrado`);
    }

    verificarDueno(
      solicitante,
      galpon.granja.propietario_id,
      'No tienes acceso a este galpón',
    );

    return galpon;
  }

  private async validarZonaConAcceso(id: number, solicitante: Solicitante) {
    const zona = await this.prisma.zonaGalpon.findUnique({
      where: { id },
      select: ZONA_SELECT,
    });

    if (!zona) {
      throw new NotFoundException(`Zona con ID ${id} no encontrada`);
    }

    verificarDueno(
      solicitante,
      zona.galpon.granja.propietario_id,
      'No tienes acceso a esta zona',
    );

    return zona;
  }

  // ============================================================
  // MÉTODOS PÚBLICOS
  // ============================================================

  async crear(dto: CreateZonaGalponDto, solicitante: Solicitante) {
    // Validar que el galpón existe y el usuario tiene acceso
    await this.validarGalpon(dto.galpon_id, solicitante);

    // Validar que no exista una zona con el mismo código en el mismo galpón
    if (dto.codigo) {
      const existente = await this.prisma.zonaGalpon.findFirst({
        where: {
          galpon_id: dto.galpon_id,
          codigo: dto.codigo,
        },
      });

      if (existente) {
        throw new BadRequestException(
          `Ya existe una zona con el código "${dto.codigo}" en este galpón`,
        );
      }
    }

    return this.prisma.zonaGalpon.create({
      data: {
        galpon_id: dto.galpon_id,
        codigo: dto.codigo,
        nombre: dto.nombre,
        tipo_zona: dto.tipo_zona,
        coordenada_x_inicio: dto.coordenada_x_inicio,
        coordenada_y_inicio: dto.coordenada_y_inicio,
        coordenada_x_fin: dto.coordenada_x_fin,
        coordenada_y_fin: dto.coordenada_y_fin,
        color_visualizacion: dto.color_visualizacion,
        activa: dto.activa !== undefined ? dto.activa : true,
      },
      select: ZONA_SELECT,
    });
  }

  async listar(solicitante: Solicitante, { page, limit }: PaginationQueryDto) {
    const where = esPropietario(solicitante)
      ? {
          galpon: {
            granja: {
              propietario_id: solicitante.id,
            },
          },
        }
      : {};

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
    return this.validarZonaConAcceso(id, solicitante);
  }

  async actualizar(
    id: number,
    dto: UpdateZonaGalponDto,
    solicitante: Solicitante,
  ) {
    // Validar que la zona existe y el usuario tiene acceso
    await this.validarZonaConAcceso(id, solicitante);

    // Construir objeto con solo los campos enviados
    const data: any = {};

    if (dto.codigo !== undefined) data.codigo = dto.codigo;
    if (dto.nombre !== undefined) data.nombre = dto.nombre;
    if (dto.tipo_zona !== undefined) data.tipo_zona = dto.tipo_zona;
    if (dto.coordenada_x_inicio !== undefined)
      data.coordenada_x_inicio = dto.coordenada_x_inicio;
    if (dto.coordenada_y_inicio !== undefined)
      data.coordenada_y_inicio = dto.coordenada_y_inicio;
    if (dto.coordenada_x_fin !== undefined)
      data.coordenada_x_fin = dto.coordenada_x_fin;
    if (dto.coordenada_y_fin !== undefined)
      data.coordenada_y_fin = dto.coordenada_y_fin;
    if (dto.color_visualizacion !== undefined)
      data.color_visualizacion = dto.color_visualizacion;
    if (dto.activa !== undefined) data.activa = dto.activa;

    if (Object.keys(data).length === 0) {
      return this.validarZonaConAcceso(id, solicitante);
    }

    return this.prisma.zonaGalpon.update({
      where: { id },
      data,
      select: ZONA_SELECT,
    });
  }

  async activar(id: number, solicitante: Solicitante) {
    await this.validarZonaConAcceso(id, solicitante);

    return this.prisma.zonaGalpon.update({
      where: { id },
      data: { activa: true },
      select: ZONA_SELECT,
    });
  }

  async desactivar(id: number, solicitante: Solicitante) {
    await this.validarZonaConAcceso(id, solicitante);

    return this.prisma.zonaGalpon.update({
      where: { id },
      data: { activa: false },
      select: ZONA_SELECT,
    });
  }

  async eliminar(id: number, solicitante: Solicitante) {
    await this.validarZonaConAcceso(id, solicitante);

    await this.prisma.zonaGalpon.delete({
      where: { id },
    });

    return { id, eliminado: true };
  }

  async obtenerPorGalpon(
    galponId: number,
    solicitante: Solicitante,
    paginacion: PaginationQueryDto,
  ) {
    const { page, limit } = paginacion;

    await this.validarGalpon(galponId, solicitante);

    const where = { galpon_id: galponId };

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
}
