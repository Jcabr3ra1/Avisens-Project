import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateConsumoDiarioDto } from './dto/create-consumo-diario.dto';
import { UpdateConsumoDiarioDto } from './dto/update-consumo-diario.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';
import { Solicitante } from '../../common/auth/acceso';
import {
  filtroRegistrosDeLote,
  verificarAccesoLote,
} from '../../common/auth/alcance';
import {
  AGUA_MAXIMA_L_POR_AVE_DIA,
  ALIMENTO_MAXIMO_KG_POR_AVE_DIA,
} from '../../common/avicultura/vocabulario';

const kg = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });

// Rechaza un consumo que ningún lote de ese tamaño puede tener en un día.
// Se compara contra las aves alojadas: es el máximo posible de bocas.
export function verificarConsumoRazonable(
  avesAlojadas: number,
  alimentoKg: number | null | undefined,
  aguaLitros: number | null | undefined,
): void {
  const aves = Math.max(avesAlojadas, 1);
  const topeAlimento = aves * ALIMENTO_MAXIMO_KG_POR_AVE_DIA;
  if (alimentoKg != null && alimentoKg > topeAlimento) {
    throw new BadRequestException(
      `${kg.format(alimentoKg)} kg de alimento en un día es imposible para ${aves.toLocaleString('es-CO')} aves (máximo ${kg.format(topeAlimento)} kg). Revisa si escribiste gramos o un cero de más`,
    );
  }
  const topeAgua = aves * AGUA_MAXIMA_L_POR_AVE_DIA;
  if (aguaLitros != null && aguaLitros > topeAgua) {
    throw new BadRequestException(
      `${kg.format(aguaLitros)} litros de agua en un día es imposible para ${aves.toLocaleString('es-CO')} aves (máximo ${kg.format(topeAgua)} L). Revisa si escribiste mililitros o un cero de más`,
    );
  }
}

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
        cantidad_inicial: true,
        galpon: { select: { granja: { select: { propietario_id: true } } } },
      },
    });

    if (!lote) throw new NotFoundException('Lote no encontrado');
    await verificarAccesoLote(
      this.prisma,
      loteId,
      solicitante,
      'Solo puedes registrar consumos de tus propios lotes',
      lote.galpon.granja.propietario_id,
    );
    return lote;
  }

  private async validarTipoAlimento(tipoAlimentoId: number) {
    const tipo = await this.prisma.tipoAlimento.findUnique({
      where: { id: tipoAlimentoId },
      select: { id: true },
    });

    if (!tipo) throw new NotFoundException('Tipo de alimento no encontrado');
  }

  async crear(dto: CreateConsumoDiarioDto, solicitante: Solicitante) {
    const lote = await this.validarLote(dto.lote_id, solicitante);
    verificarConsumoRazonable(
      lote.cantidad_inicial,
      dto.alimento_kg,
      dto.agua_litros,
    );
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
    const where = filtroRegistrosDeLote(solicitante);

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
    await verificarAccesoLote(
      this.prisma,
      consumo.lote_id,
      solicitante,
      'Solo puedes ver consumos de tus propios lotes',
      consumo.lote.galpon.granja.propietario_id,
    );
    return consumo;
  }

  async actualizar(
    id: number,
    dto: UpdateConsumoDiarioDto,
    solicitante: Solicitante,
  ) {
    const actual = await this.obtener(id, solicitante);

    // El tope se mide contra el lote final del registro y los valores que
    // quedarán guardados, aunque la edición solo cambie uno de los dos.
    const lote = await this.validarLote(
      dto.lote_id ?? actual.lote_id,
      solicitante,
    );
    verificarConsumoRazonable(
      lote.cantidad_inicial,
      dto.alimento_kg ?? actual.alimento_kg,
      dto.agua_litros ?? actual.agua_litros,
    );
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
