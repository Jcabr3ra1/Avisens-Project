import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGranjaDto } from './dto/create-granja.dto';
import { UpdateGranjaDto } from './dto/update-granja.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';
import { esPropietario } from '../../common/auth/acceso';
import type { Solicitante } from '../../common/auth/acceso';
import {
  filtroGranjas,
  verificarAccesoGranja,
} from '../../common/auth/alcance';

const GRANJA_SELECT = {
  id: true,
  organizacion_id: true,
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
  organizacion: { select: { id: true, nombre: true } },
} as const;

@Injectable()
export class GranjasService {
  constructor(private prisma: PrismaService) {}

  private organizacionDelPropietario(solicitante: Solicitante): number {
    if (!solicitante.organizacion_id) {
      throw new ForbiddenException(
        'Tu cuenta de propietario no tiene una organización asignada',
      );
    }
    return solicitante.organizacion_id;
  }

  async crear(dto: CreateGranjaDto, solicitante: Solicitante) {
    let propietarioId: number;
    let organizacionId: number;
    if (esPropietario(solicitante)) {
      propietarioId = solicitante.id;
      organizacionId = this.organizacionDelPropietario(solicitante);
    } else {
      if (!dto.propietario_id) {
        throw new BadRequestException(
          'Debe indicar el propietario de la granja',
        );
      }
      const propietario = await this.prisma.usuario.findUnique({
        where: { id: dto.propietario_id },
        select: {
          id: true,
          organizacion_id: true,
          rol: { select: { nombre: true } },
        },
      });
      if (!propietario)
        throw new NotFoundException('Propietario no encontrado');
      if (propietario.rol.nombre !== 'Propietario') {
        throw new BadRequestException(
          'El usuario indicado no tiene el rol Propietario',
        );
      }
      if (!propietario.organizacion_id) {
        throw new BadRequestException(
          'El propietario no tiene una organización asignada',
        );
      }
      propietarioId = dto.propietario_id;
      organizacionId = propietario.organizacion_id;
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
        organizacion_id: organizacionId,
      },
      select: GRANJA_SELECT,
    });
  }

  async listar(solicitante: Solicitante, { page, limit }: PaginationQueryDto) {
    const where = filtroGranjas(solicitante);

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
    await verificarAccesoGranja(
      this.prisma,
      id,
      solicitante,
      'Solo puedes gestionar tus propias granjas',
      granja.propietario.id,
    );
    return granja;
  }

  async actualizar(id: number, dto: UpdateGranjaDto, solicitante: Solicitante) {
    const actual = await this.obtener(id, solicitante);

    let propietarioId = dto.propietario_id;
    let organizacionId: number | undefined;
    if (esPropietario(solicitante)) {
      propietarioId = undefined;
    } else if (dto.propietario_id) {
      const propietario = await this.prisma.usuario.findUnique({
        where: { id: dto.propietario_id },
        select: {
          id: true,
          organizacion_id: true,
          rol: { select: { nombre: true } },
        },
      });
      if (!propietario)
        throw new NotFoundException('Propietario no encontrado');
      if (propietario.rol.nombre !== 'Propietario') {
        throw new BadRequestException(
          'El usuario indicado no tiene el rol Propietario',
        );
      }
      if (!propietario.organizacion_id) {
        throw new BadRequestException(
          'El propietario no tiene una organización asignada',
        );
      }
      organizacionId = propietario.organizacion_id;
    }

    const actualizar = this.prisma.granja.update({
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
        organizacion_id: organizacionId,
      },
      select: GRANJA_SELECT,
    });

    if (
      organizacionId !== undefined &&
      organizacionId !== actual.organizacion_id
    ) {
      const [, granja] = await this.prisma.$transaction([
        this.prisma.usuarioGalpon.updateMany({
          where: { activa: true, galpon: { granja_id: id } },
          data: { activa: false },
        }),
        actualizar,
      ]);
      return granja;
    }

    return actualizar;
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
