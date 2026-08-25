import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGalponDto } from './dto/create-galpon.dto';
import { UpdateGalponDto } from './dto/update-galpon.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';
import { esPropietario, verificarDueno } from '../../common/auth/acceso';
import type { Solicitante } from '../../common/auth/acceso';

const GALPON_SELECT = {
  id: true,
  codigo: true,
  nombre: true,
  capacidad_aves: true,
  ancho_metros: true,
  largo_metros: true,
  orientacion: true,
  tipo_techo: true,
  plano_url: true,
  activo: true,
  fecha_construccion: true,
  granja: { select: { id: true, nombre: true, propietario_id: true } },
} as const;

@Injectable()
export class GalponesService {
  constructor(private prisma: PrismaService) {}

  private async validarGranja(granjaId: number, solicitante: Solicitante) {
    const granja = await this.prisma.granja.findUnique({
      where: { id: granjaId },
    });
    if (!granja) throw new NotFoundException('Granja no encontrada');
    verificarDueno(
      solicitante,
      granja.propietario_id,
      'Solo puedes gestionar galpones de tus propias granjas',
    );
  }

  async crear(dto: CreateGalponDto, solicitante: Solicitante) {
    await this.validarGranja(dto.granja_id, solicitante);

    return this.prisma.galpon.create({
      data: {
        granja_id: dto.granja_id,
        codigo: dto.codigo,
        nombre: dto.nombre,
        capacidad_aves: dto.capacidad_aves,
        ancho_metros: dto.ancho_metros,
        largo_metros: dto.largo_metros,
        orientacion: dto.orientacion,
        tipo_techo: dto.tipo_techo,
        plano_url: dto.plano_url,
        fecha_construccion: dto.fecha_construccion
          ? new Date(dto.fecha_construccion)
          : undefined,
      },
      select: GALPON_SELECT,
    });
  }

  async listar(solicitante: Solicitante, { page, limit }: PaginationQueryDto) {
    const where = esPropietario(solicitante)
      ? { granja: { propietario_id: solicitante.id } }
      : undefined;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.galpon.findMany({
        where,
        select: GALPON_SELECT,
        orderBy: { id: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.galpon.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async obtener(id: number, solicitante: Solicitante) {
    const galpon = await this.prisma.galpon.findUnique({
      where: { id },
      select: GALPON_SELECT,
    });
    if (!galpon) throw new NotFoundException('Galpón no encontrado');
    verificarDueno(
      solicitante,
      galpon.granja.propietario_id,
      'Solo puedes gestionar galpones de tus propias granjas',
    );
    return galpon;
  }

  async actualizar(id: number, dto: UpdateGalponDto, solicitante: Solicitante) {
    await this.obtener(id, solicitante);

    if (dto.granja_id) {
      await this.validarGranja(dto.granja_id, solicitante);
    }

    return this.prisma.galpon.update({
      where: { id },
      data: {
        granja_id: dto.granja_id,
        codigo: dto.codigo,
        nombre: dto.nombre,
        capacidad_aves: dto.capacidad_aves,
        ancho_metros: dto.ancho_metros,
        largo_metros: dto.largo_metros,
        orientacion: dto.orientacion,
        tipo_techo: dto.tipo_techo,
        plano_url: dto.plano_url,
        activo: dto.activo,
        fecha_construccion: dto.fecha_construccion
          ? new Date(dto.fecha_construccion)
          : undefined,
      },
      select: GALPON_SELECT,
    });
  }

  async desactivar(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante);

    await this.prisma.$transaction([
      this.prisma.usuarioGalpon.updateMany({
        where: { galpon_id: id, activa: true },
        data: { activa: false },
      }),
      this.prisma.galpon.update({
        where: { id },
        data: { activo: false },
      }),
    ]);
    return { id, activo: false };
  }

  async activar(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante);

    await this.prisma.galpon.update({ where: { id }, data: { activo: true } });
    return { id, activo: true };
  }

  async eliminarPermanente(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante);

    await this.prisma.$transaction([
      this.prisma.usuarioGalpon.deleteMany({ where: { galpon_id: id } }),
      this.prisma.galpon.delete({ where: { id } }),
    ]);
    return { id, eliminado: true };
  }
}
