import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateConsumoDiarioDto } from './dto/create-consumo-diario.dto';
import { UpdateConsumoDiarioDto } from './dto/update-consumo-diario.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';
import {
  esPropietario,
  verificarDueno,
  Solicitante,
} from '../../common/acceso';

const CONSUMO_SELECT = {
  id: true,
  lote_id: true,
  tipo_alimento_id: true,
  usuario_id: true,
  fecha: true,
  alimento_kg: true,
  agua_litros: true,
  alerta_agua_baja: true,
  metodo_registro: true,
  fecha_registro: true,
  lote: {
    select: {
      id: true,
      codigo: true,
      galpon: { select: { granja: { select: { propietario_id: true } } } },
    },
  },
  tipo_alimento: { select: { id: true, nombre: true } },
} as const;

@Injectable()
export class ConsumosDiariosService {
  constructor(private prisma: PrismaService) {}

  private async validarLote(loteId: number, solicitante: Solicitante) {
    const lote = await this.prisma.lote.findUnique({
      where: { id: loteId },
      select: {
        id: true,
        galpon: { select: { granja: { select: { propietario_id: true } } } },
      },
    });

    if (!lote) throw new NotFoundException('Lote no encontrado');
    verificarDueno(
      solicitante,
      lote.galpon.granja.propietario_id,
      'Solo puedes registrar consumos de tus propios lotes',
    );
  }

  private async validarTipoAlimento(tipoAlimentoId: number) {
    const tipo = await this.prisma.tipoAlimento.findUnique({
      where: { id: tipoAlimentoId },
      select: { id: true },
    });

    if (!tipo) throw new NotFoundException('Tipo de alimento no encontrado');
  }

  async crear(dto: CreateConsumoDiarioDto, solicitante: Solicitante) {
    await this.validarLote(dto.lote_id, solicitante);
    if (dto.tipo_alimento_id) {
      await this.validarTipoAlimento(dto.tipo_alimento_id);
    }

    return this.prisma.consumoDiario.create({
      data: {
        lote_id: dto.lote_id,
        tipo_alimento_id: dto.tipo_alimento_id,
        usuario_id: solicitante.id,
        fecha: new Date(dto.fecha),
        alimento_kg: dto.alimento_kg,
        agua_litros: dto.agua_litros,
        metodo_registro: dto.metodo_registro,
      },
      select: CONSUMO_SELECT,
    });
  }

  async listar(solicitante: Solicitante, { page, limit }: PaginationQueryDto) {
    const where = esPropietario(solicitante)
      ? { lote: { galpon: { granja: { propietario_id: solicitante.id } } } }
      : undefined;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.consumoDiario.findMany({
        where,
        select: CONSUMO_SELECT,
        orderBy: { fecha: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.consumoDiario.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async obtener(id: number, solicitante: Solicitante) {
    const consumo = await this.prisma.consumoDiario.findUnique({
      where: { id },
      select: CONSUMO_SELECT,
    });

    if (!consumo) throw new NotFoundException('Consumo diario no encontrado');
    verificarDueno(
      solicitante,
      consumo.lote.galpon.granja.propietario_id,
      'Solo puedes ver consumos de tus propios lotes',
    );
    return consumo;
  }

  async actualizar(
    id: number,
    dto: UpdateConsumoDiarioDto,
    solicitante: Solicitante,
  ) {
    await this.obtener(id, solicitante);

    if (dto.lote_id) {
      await this.validarLote(dto.lote_id, solicitante);
    }
    if (dto.tipo_alimento_id) {
      await this.validarTipoAlimento(dto.tipo_alimento_id);
    }

    return this.prisma.consumoDiario.update({
      where: { id },
      data: {
        lote_id: dto.lote_id,
        tipo_alimento_id: dto.tipo_alimento_id,
        fecha: dto.fecha ? new Date(dto.fecha) : undefined,
        alimento_kg: dto.alimento_kg,
        agua_litros: dto.agua_litros,
        metodo_registro: dto.metodo_registro,
      },
      select: CONSUMO_SELECT,
    });
  }

  async eliminar(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante);

    await this.prisma.consumoDiario.delete({ where: { id } });
    return { id, eliminado: true };
  }
}
