import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGalponDto } from './dto/create-galpon.dto';
import { UpdateGalponDto } from './dto/update-galpon.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';
import { verificarDueno } from '../../common/auth/acceso';
import type { Solicitante } from '../../common/auth/acceso';
import {
  filtroGalpones,
  verificarAccesoGalpon,
} from '../../common/auth/alcance';
import { randomUUID } from 'node:crypto';
import { esViolacionDeLlaveForanea } from '../../common/errores/llave-foranea';
import {
  esTimeoutDeBloqueo,
  MENSAJE_GALPON_OCUPADO,
} from '../../common/errores/bloqueo';
import {
  eliminarAsignacionesDelGalpon,
  OPCIONES_TRANSACCION_ORDENADA,
  revocarAsignacionesDelGalpon,
} from '../../common/bloqueos/revocar-acceso';

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

    return this.prisma.$transaction(async (transaccion) => {
      const creado = await transaccion.galpon.create({
        data: {
          granja_id: dto.granja_id,
          codigo: `TEMP-${randomUUID()}`,
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
        select: { id: true },
      });

      return transaccion.galpon.update({
        where: { id: creado.id },
        data: { codigo: `GAL-${String(creado.id).padStart(6, '0')}` },
        select: GALPON_SELECT,
      });
    });
  }

  async listar(solicitante: Solicitante, { page, limit }: PaginationQueryDto) {
    const where = filtroGalpones(solicitante);

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
    await verificarAccesoGalpon(
      this.prisma,
      id,
      solicitante,
      'Solo puedes gestionar galpones de tus propias granjas',
      galpon.granja.propietario_id,
    );
    return galpon;
  }

  async actualizar(id: number, dto: UpdateGalponDto, solicitante: Solicitante) {
    const actual = await this.obtener(id, solicitante);

    if (dto.granja_id !== undefined && dto.granja_id !== actual.granja.id) {
      throw new BadRequestException(
        'No se puede trasladar un galpón a otra granja; crea un galpón nuevo para conservar la integridad histórica',
      );
    }

    const data = {
      granja_id: undefined,
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
    };

    if (dto.activo !== false) {
      return this.prisma.galpon.update({
        where: { id },
        data,
        select: GALPON_SELECT,
      });
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SET LOCAL lock_timeout = '5000ms'`;
        const galpon = await tx.galpon.update({
          where: { id },
          data,
          select: GALPON_SELECT,
        });
        await revocarAsignacionesDelGalpon(tx, id);
        return galpon;
      }, OPCIONES_TRANSACCION_ORDENADA);
    } catch (error) {
      this.traducirTimeoutDeBloqueo(error);
      throw error;
    }
  }

  private traducirTimeoutDeBloqueo(error: unknown): void {
    if (esTimeoutDeBloqueo(error)) {
      throw new ConflictException(MENSAJE_GALPON_OCUPADO);
    }
  }

  async desactivar(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante);

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SET LOCAL lock_timeout = '5000ms'`;
        await tx.galpon.update({ where: { id }, data: { activo: false } });
        await revocarAsignacionesDelGalpon(tx, id);
      }, OPCIONES_TRANSACCION_ORDENADA);
    } catch (error) {
      this.traducirTimeoutDeBloqueo(error);
      throw error;
    }
    return { id, activo: false };
  }

  async activar(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante);

    await this.prisma.galpon.update({ where: { id }, data: { activo: true } });
    return { id, activo: true };
  }

  async eliminarPermanente(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante);

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SET LOCAL lock_timeout = '5000ms'`;
        await tx.$queryRaw`SELECT "id" FROM "galpones" WHERE "id" = ${id} FOR UPDATE`;
        await eliminarAsignacionesDelGalpon(tx, id);
        await tx.galpon.delete({ where: { id } });
      }, OPCIONES_TRANSACCION_ORDENADA);
    } catch (error) {
      this.traducirTimeoutDeBloqueo(error);
      if (esViolacionDeLlaveForanea(error)) {
        throw new ConflictException(
          'No se puede eliminar: el galpón tiene lotes, sensores, equipos u otros registros asociados. Elimínalos primero, o desactiva el galpón en su lugar.',
        );
      }
      throw error;
    }
    return { id, eliminado: true };
  }
}
