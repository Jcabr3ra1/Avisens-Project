import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePoliticasAlertaDto } from './dto/create-politicas-alerta.dto';
import { UpdatePoliticasAlertaDto } from './dto/update-politicas-alerta.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';
import { esPropietario, verificarDueno } from '../../common/acceso';
import type { Solicitante } from '../../common/acceso';

const POLITICAS_ALERTA_SELECT = {
  id: true,
  granja_id: true,
  criticidad: true,
  nivel_escalamiento: true,
  canal: true,
  tiempo_max_respuesta_seg: true,
  verificado: true,
  activa: true,
  fecha_actualizacion: true,
  granja: {
    select: {
      id: true,
      nombre: true,
      propietario_id: true,
    },
  },
} as const;

const CRITICIDADES_VALIDAS = ['Baja', 'Media', 'Alta'];
const CANALES_VALIDOS = ['WhatsApp', 'Email', 'SMS'];

@Injectable()
export class PoliticasAlertaService {
  constructor(private prisma: PrismaService) {}

  private async validarGranja(granjaId: number, solicitante: Solicitante) {
    const granja = await this.prisma.granja.findUnique({
      where: { id: granjaId },
      select: {
        id: true,
        propietario_id: true,
      },
    });

    if (!granja) {
      throw new NotFoundException('Granja no encontrada');
    }

    verificarDueno(
      solicitante,
      granja.propietario_id,
      'Solo puedes gestionar politicas de alertas de tus propias granjas',
    );
  }

  private validarDatosPolitica(dto: {
    criticidad?: string;
    canal?: string;
    tiempo_max_respuesta_seg?: number;
    nivel_escalamiento?: number;
  }) {
    if (
      dto.criticidad !== undefined &&
      !CRITICIDADES_VALIDAS.includes(dto.criticidad)
    ) {
      throw new BadRequestException(
        'La criticidad debe ser: Baja, Media o Alta',
      );
    }

    if (dto.canal !== undefined && !CANALES_VALIDOS.includes(dto.canal)) {
      throw new BadRequestException('El canal debe ser: WhatsApp, Email o SMS');
    }

    if (
      dto.tiempo_max_respuesta_seg !== undefined &&
      dto.tiempo_max_respuesta_seg <= 0
    ) {
      throw new BadRequestException(
        'El tiempo máximo de respuesta debe ser mayor que cero',
      );
    }

    if (dto.nivel_escalamiento !== undefined && dto.nivel_escalamiento <= 0) {
      throw new BadRequestException(
        'El nivel de escalamiento debe ser mayor que cero',
      );
    }
  }

  private async verificarPoliticaDuplicada(
    granjaId: number,
    criticidad: string,
    excluirId: number,
  ) {
    const existente = await this.prisma.politicaAlerta.findFirst({
      where: {
        granja_id: granjaId,
        criticidad,
        activa: true,
        id: excluirId ? { not: excluirId } : undefined,
      },
      select: { id: true },
    });

    if (existente) {
      throw new ConflictException(
        'Ya existe una politica activa con esta criticidad para la granja',
      );
    }
  }

  async crear(dto: CreatePoliticasAlertaDto, solicitante: Solicitante) {
    this.validarDatosPolitica(dto);

    await this.validarGranja(dto.granja_id, solicitante);

    await this.verificarPoliticaDuplicada(dto.granja_id, dto.criticidad, 0);

    return this.prisma.politicaAlerta.create({
      data: {
        granja_id: dto.granja_id,
        criticidad: dto.criticidad,
        nivel_escalamiento: dto.nivel_escalamiento,
        canal: dto.canal,
        tiempo_max_respuesta_seg: dto.tiempo_max_respuesta_seg,
        verificado: dto.verificado,
        activa: dto.activa,
      },
      select: POLITICAS_ALERTA_SELECT,
    });
  }

  async obtener(id: number, solicitante: Solicitante) {
    const politica = await this.prisma.politicaAlerta.findUnique({
      where: { id },
      select: POLITICAS_ALERTA_SELECT,
    });

    if (!politica) {
      throw new NotFoundException('Política de alerta no encontrada');
    }

    verificarDueno(
      solicitante,
      politica.granja.propietario_id,
      'Solo puedes gestionar políticas de alerta de tus propias granjas',
    );

    return politica;
  }

  async listar(solicitante: Solicitante, { page, limit }: PaginationQueryDto) {
    const where = esPropietario(solicitante)
      ? {
          granja: {
            propietario_id: solicitante.id,
          },
        }
      : undefined;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.politicaAlerta.findMany({
        where,
        select: POLITICAS_ALERTA_SELECT,
        orderBy: { fecha_actualizacion: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.politicaAlerta.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async actualizar(
    id: number,
    dto: UpdatePoliticasAlertaDto,
    solicitante: Solicitante,
  ) {
    const politicaActual = await this.obtener(id, solicitante);

    this.validarDatosPolitica(dto);

    const granjaIdFinal = dto.granja_id ?? politicaActual.granja_id;
    const criticidadFinal = dto.criticidad ?? politicaActual.criticidad;
    const activaFinal = dto.activa ?? politicaActual.activa;

    if (dto.granja_id !== undefined) {
      await this.validarGranja(dto.granja_id, solicitante);
    }

    if (activaFinal) {
      await this.verificarPoliticaDuplicada(granjaIdFinal, criticidadFinal, id);
    }

    return this.prisma.politicaAlerta.update({
      where: { id },
      data: {
        granja_id: dto.granja_id,
        criticidad: dto.criticidad,
        nivel_escalamiento: dto.nivel_escalamiento,
        canal: dto.canal,
        tiempo_max_respuesta_seg: dto.tiempo_max_respuesta_seg,
        verificado: dto.verificado,
        activa: dto.activa,
      },
      select: POLITICAS_ALERTA_SELECT,
    });
  }

  async desactivar(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante);

    return this.prisma.politicaAlerta.update({
      where: { id },
      data: { activa: false },
      select: POLITICAS_ALERTA_SELECT,
    });
  }

  async activar(id: number, solicitante: Solicitante) {
    const politica = await this.obtener(id, solicitante);

    await this.verificarPoliticaDuplicada(
      politica.granja_id,
      politica.criticidad,
      id,
    );

    return this.prisma.politicaAlerta.update({
      where: { id },
      data: { activa: true },
      select: POLITICAS_ALERTA_SELECT,
    });
  }
}
