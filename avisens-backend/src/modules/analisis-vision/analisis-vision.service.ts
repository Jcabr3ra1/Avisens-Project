import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Solicitante } from '../../common/auth/acceso';
import {
  filtroGalpones,
  verificarAccesoGalpon,
} from '../../common/auth/alcance';
import { paginate } from '../../common/pagination/paginate';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateAnalisisVisionDto,
  ListarAnalisisVisionDto,
} from './dto/create-analisis-vision.dto';
import { UpdateAnalisisVisionDto } from './dto/update-analisis-vision.dto';

const SIN_ACCESO = 'No tienes acceso al galpón de este análisis';

const SELECT = {
  id: true,
  galpon_id: true,
  lote_id: true,
  modelo_id: true,
  fecha_hora: true,
  tipo_analisis: true,
  resultado: true,
  imagen_url: true,
  galpon: {
    select: {
      id: true,
      nombre: true,
      granja: { select: { propietario_id: true } },
    },
  },
  lote: { select: { id: true, codigo: true } },
  modelo: { select: { id: true, nombre: true, version: true } },
} as const;

@Injectable()
export class AnalisisVisionService {
  constructor(private prisma: PrismaService) {}

  private async validarRelaciones(
    galponId: number,
    loteId: number | null | undefined,
    modeloId: number | null | undefined,
    solicitante: Solicitante,
  ) {
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

    if (loteId !== undefined && loteId !== null) {
      const lote = await this.prisma.lote.findUnique({
        where: { id: loteId },
        select: { galpon_id: true },
      });
      if (!lote) throw new NotFoundException('Lote no encontrado');
      if (lote.galpon_id !== galponId) {
        throw new BadRequestException(
          'El lote no pertenece al galpón indicado',
        );
      }
    }

    if (modeloId !== undefined && modeloId !== null) {
      const modelo = await this.prisma.modeloMl.findFirst({
        where: { id: modeloId, activo: true },
        select: { id: true },
      });
      if (!modelo)
        throw new NotFoundException('Modelo ML activo no encontrado');
    }
  }

  async crear(dto: CreateAnalisisVisionDto, solicitante: Solicitante) {
    await this.validarRelaciones(
      dto.galpon_id,
      dto.lote_id,
      dto.modelo_id,
      solicitante,
    );
    return this.prisma.analisisVision.create({
      data: {
        galpon_id: dto.galpon_id,
        lote_id: dto.lote_id,
        modelo_id: dto.modelo_id,
        fecha_hora: dto.fecha_hora ? new Date(dto.fecha_hora) : undefined,
        tipo_analisis: dto.tipo_analisis,
        resultado: dto.resultado as Prisma.InputJsonValue,
        imagen_url: dto.imagen_url,
      },
      select: SELECT,
    });
  }

  async listar(
    solicitante: Solicitante,
    { page, limit, galpon_id, lote_id, modelo_id }: ListarAnalisisVisionDto,
  ) {
    const galpon = filtroGalpones(solicitante);
    const where = {
      ...(galpon_id !== undefined ? { galpon_id } : {}),
      ...(lote_id !== undefined ? { lote_id } : {}),
      ...(modelo_id !== undefined ? { modelo_id } : {}),
      ...(galpon ? { galpon } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.analisisVision.findMany({
        where,
        select: SELECT,
        orderBy: { fecha_hora: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.analisisVision.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  async obtener(id: number, solicitante: Solicitante) {
    const analisis = await this.prisma.analisisVision.findUnique({
      where: { id },
      select: SELECT,
    });
    if (!analisis)
      throw new NotFoundException('Análisis de visión no encontrado');
    await verificarAccesoGalpon(
      this.prisma,
      analisis.galpon_id,
      solicitante,
      SIN_ACCESO,
      analisis.galpon.granja.propietario_id,
    );
    return analisis;
  }

  async actualizar(
    id: number,
    dto: UpdateAnalisisVisionDto,
    solicitante: Solicitante,
  ) {
    const actual = await this.obtener(id, solicitante);
    await this.validarRelaciones(
      dto.galpon_id ?? actual.galpon_id,
      dto.lote_id ?? actual.lote_id,
      dto.modelo_id ?? actual.modelo_id,
      solicitante,
    );
    return this.prisma.analisisVision.update({
      where: { id },
      data: {
        galpon_id: dto.galpon_id,
        lote_id: dto.lote_id,
        modelo_id: dto.modelo_id,
        fecha_hora: dto.fecha_hora ? new Date(dto.fecha_hora) : undefined,
        tipo_analisis: dto.tipo_analisis,
        resultado: dto.resultado as Prisma.InputJsonValue,
        imagen_url: dto.imagen_url,
      },
      select: SELECT,
    });
  }

  async eliminar(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante);
    await this.prisma.analisisVision.delete({ where: { id } });
    return { id, eliminado: true };
  }
}
