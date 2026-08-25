import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUmbralDto } from './dto/create-umbral.dto';
import { RevisarUmbralDto } from './dto/revisar-umbral.dto';
import { QueryUmbralesDto } from './dto/query-umbrales.dto';
import { paginate } from '../../common/pagination/paginate';
import { esPropietario, verificarDueno } from '../../common/auth/acceso';
import type { Solicitante } from '../../common/auth/acceso';

const UMBRAL_SELECT = {
  id: true,
  galpon_id: true,
  variable: true,
  semana_vida: true,
  valor_minimo: true,
  valor_maximo: true,
  unidad: true,
  criticidad: true,
  vigente: true,
  version: true,
  fecha_creacion: true,
  galpon: {
    select: {
      id: true,
      nombre: true,
      granja: { select: { id: true, propietario_id: true } },
    },
  },
} as const;

@Injectable()
export class UmbralesService {
  constructor(private prisma: PrismaService) {}

  private async validarGalpon(galponId: number, solicitante: Solicitante) {
    const galpon = await this.prisma.galpon.findUnique({
      where: { id: galponId },
      select: { id: true, granja: { select: { propietario_id: true } } },
    });
    if (!galpon) throw new NotFoundException('Galpón no encontrado');
    verificarDueno(
      solicitante,
      galpon.granja.propietario_id,
      'Solo puedes gestionar umbrales de tus propios galpones',
    );
  }

  async crear(dto: CreateUmbralDto, solicitante: Solicitante) {
    await this.validarGalpon(dto.galpon_id, solicitante);

    const existente = await this.prisma.umbralAmbiental.findFirst({
      where: {
        galpon_id: dto.galpon_id,
        variable: dto.variable,
        semana_vida: dto.semana_vida,
        vigente: true,
      },
      select: { id: true },
    });
    if (existente) {
      throw new ConflictException(
        'Ya existe un umbral vigente para ese galpón, variable y semana. Usa revisar para cambiarlo.',
      );
    }

    return this.prisma.umbralAmbiental.create({
      data: {
        galpon_id: dto.galpon_id,
        variable: dto.variable,
        semana_vida: dto.semana_vida,
        valor_minimo: dto.valor_minimo,
        valor_maximo: dto.valor_maximo,
        unidad: dto.unidad,
        criticidad: dto.criticidad,
      },
      select: UMBRAL_SELECT,
    });
  }

  async obtener(id: number, solicitante: Solicitante) {
    const umbral = await this.prisma.umbralAmbiental.findUnique({
      where: { id },
      select: UMBRAL_SELECT,
    });
    if (!umbral) throw new NotFoundException('Umbral no encontrado');
    verificarDueno(
      solicitante,
      umbral.galpon.granja.propietario_id,
      'Solo puedes gestionar umbrales de tus propios galpones',
    );
    return umbral;
  }

  async revisar(id: number, dto: RevisarUmbralDto, solicitante: Solicitante) {
    const actual = await this.obtener(id, solicitante);
    if (!actual.vigente) {
      throw new BadRequestException(
        'Solo puedes revisar el umbral vigente (este ya fue reemplazado o jubilado).',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.umbralAmbiental.update({
        where: { id: actual.id },
        data: { vigente: false },
      });
      return tx.umbralAmbiental.create({
        data: {
          galpon_id: actual.galpon_id,
          variable: actual.variable,
          semana_vida: actual.semana_vida,
          valor_minimo: dto.valor_minimo ?? actual.valor_minimo,
          valor_maximo: dto.valor_maximo ?? actual.valor_maximo,
          unidad: dto.unidad ?? actual.unidad,
          criticidad: dto.criticidad ?? actual.criticidad,
          version: actual.version + 1,
          vigente: true,
        },
        select: UMBRAL_SELECT,
      });
    });
  }

  async listar(query: QueryUmbralesDto, solicitante: Solicitante) {
    const { galpon_id, variable, incluir_historico, page, limit } = query;

    const where = {
      galpon_id,
      variable,

      vigente: incluir_historico ? undefined : true,
      galpon: esPropietario(solicitante)
        ? { granja: { propietario_id: solicitante.id } }
        : undefined,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.umbralAmbiental.findMany({
        where,
        select: UMBRAL_SELECT,
        orderBy: [
          { galpon_id: 'asc' },
          { variable: 'asc' },
          { semana_vida: 'asc' },
          { version: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.umbralAmbiental.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async jubilar(id: number, solicitante: Solicitante) {
    const actual = await this.obtener(id, solicitante);
    if (!actual.vigente) {
      throw new BadRequestException('Este umbral ya no está vigente.');
    }
    await this.prisma.umbralAmbiental.update({
      where: { id },
      data: { vigente: false },
    });
    return { id, vigente: false };
  }
}
