import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGranjaDto } from './dto/create-granja.dto';
import { UpdateGranjaDto } from './dto/update-granja.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';
import { esPropietario, verificarDueno } from '../../common/acceso';
import type { Solicitante } from '../../common/acceso';

const GRANJA_SELECT = {
  id: true,
  nombre: true,
  direccion: true,
  municipio: true,
  departamento: true,
  latitud: true,
  longitud: true,
  area_total_m2: true,
  activa: true,
  fecha_creacion: true,
  propietario: { select: { id: true, nombre_completo: true } },
} as const;

@Injectable()
export class GranjasService {
  constructor(private prisma: PrismaService) {}

  async crear(dto: CreateGranjaDto, solicitante: Solicitante) {
    let propietarioId: number;
    if (esPropietario(solicitante)) {
      propietarioId = solicitante.id;
    } else {
      if (!dto.propietario_id) {
        throw new BadRequestException(
          'Debe indicar el propietario de la granja',
        );
      }
      const propietario = await this.prisma.usuario.findUnique({
        where: { id: dto.propietario_id },
      });
      if (!propietario)
        throw new NotFoundException('Propietario no encontrado');
      propietarioId = dto.propietario_id;
    }

    return this.prisma.granja.create({
      data: {
        nombre: dto.nombre,
        direccion: dto.direccion,
        municipio: dto.municipio,
        departamento: dto.departamento,
        latitud: dto.latitud,
        longitud: dto.longitud,
        area_total_m2: dto.area_total_m2,
        propietario_id: propietarioId,
      },
      select: GRANJA_SELECT,
    });
  }

  async listar(solicitante: Solicitante, { page, limit }: PaginationQueryDto) {
    const where = esPropietario(solicitante)
      ? { propietario_id: solicitante.id }
      : undefined;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.granja.findMany({
        where,
        select: GRANJA_SELECT,
        orderBy: { fecha_creacion: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.granja.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async obtener(id: number, solicitante: Solicitante) {
    const granja = await this.prisma.granja.findUnique({
      where: { id },
      select: GRANJA_SELECT,
    });
    if (!granja) throw new NotFoundException('Granja no encontrada');
    verificarDueno(
      solicitante,
      granja.propietario.id,
      'Solo puedes gestionar tus propias granjas',
    );
    return granja;
  }

  async actualizar(id: number, dto: UpdateGranjaDto, solicitante: Solicitante) {
    await this.obtener(id, solicitante);

    let propietarioId = dto.propietario_id;
    if (esPropietario(solicitante)) {
      propietarioId = undefined;
    } else if (dto.propietario_id) {
      const propietario = await this.prisma.usuario.findUnique({
        where: { id: dto.propietario_id },
      });
      if (!propietario)
        throw new NotFoundException('Propietario no encontrado');
    }

    return this.prisma.granja.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        direccion: dto.direccion,
        municipio: dto.municipio,
        departamento: dto.departamento,
        latitud: dto.latitud,
        longitud: dto.longitud,
        area_total_m2: dto.area_total_m2,
        activa: dto.activa,
        propietario_id: propietarioId,
      },
      select: GRANJA_SELECT,
    });
  }

  async desactivar(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante);

    await this.prisma.granja.update({ where: { id }, data: { activa: false } });
    return { id, activa: false };
  }

  async activar(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante);

    await this.prisma.granja.update({ where: { id }, data: { activa: true } });
    return { id, activa: true };
  }

  async eliminarPermanente(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante);

    await this.prisma.granja.delete({ where: { id } });
    return { id, eliminado: true };
  }
}
