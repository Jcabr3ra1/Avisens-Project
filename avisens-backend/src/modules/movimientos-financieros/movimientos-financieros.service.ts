import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMovimientoFinancieroDto } from './dto/create-movimiento-financiero.dto';
import { UpdateMovimientoFinancieroDto } from './dto/update-movimiento-financiero.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';
import {
  esPropietario,
  verificarDueno,
  Solicitante,
} from '../../common/acceso';

const MOVIMIENTO_SELECT = {
  id: true,
  lote_id: true,
  categoria_id: true,
  proveedor_id: true,
  tipo: true,
  valor_cop: true,
  fecha: true,
  descripcion: true,
  numero_factura: true,
  metodo_pago: true,
  usuario_id: true,
  fecha_registro: true,
  categoria: { select: { id: true, nombre: true, tipo: true } },
  lote: {
    select: {
      id: true,
      codigo: true,
      galpon: { select: { granja: { select: { propietario_id: true } } } },
    },
  },
} as const;

@Injectable()
export class MovimientosFinancierosService {
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
      'Solo puedes registrar movimientos de tus propios lotes',
    );
  }

  private async validarCategoria(categoriaId: number) {
    const categoria = await this.prisma.categoriaFinanciera.findUnique({
      where: { id: categoriaId },
      select: { id: true },
    });
    if (!categoria)
      throw new NotFoundException('Categoria financiera no encontrada');
  }

  async crear(dto: CreateMovimientoFinancieroDto, solicitante: Solicitante) {
    await this.validarCategoria(dto.categoria_id);
    if (dto.lote_id) {
      await this.validarLote(dto.lote_id, solicitante);
    }

    return this.prisma.movimientoFinanciero.create({
      data: {
        categoria_id: dto.categoria_id,
        tipo: dto.tipo,
        valor_cop: dto.valor_cop,
        fecha: new Date(dto.fecha),
        lote_id: dto.lote_id,
        proveedor_id: dto.proveedor_id,
        descripcion: dto.descripcion,
        numero_factura: dto.numero_factura,
        metodo_pago: dto.metodo_pago,
        usuario_id: solicitante.id,
      },
      select: MOVIMIENTO_SELECT,
    });
  }

  async listar(solicitante: Solicitante, { page, limit }: PaginationQueryDto) {
    const where = esPropietario(solicitante)
      ? { lote: { galpon: { granja: { propietario_id: solicitante.id } } } }
      : undefined;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.movimientoFinanciero.findMany({
        where,
        select: MOVIMIENTO_SELECT,
        orderBy: { fecha: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.movimientoFinanciero.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async obtener(id: number, solicitante: Solicitante) {
    const movimiento = await this.prisma.movimientoFinanciero.findUnique({
      where: { id },
      select: MOVIMIENTO_SELECT,
    });
    if (!movimiento)
      throw new NotFoundException('Movimiento financiero no encontrado');
    if (movimiento.lote) {
      verificarDueno(
        solicitante,
        movimiento.lote.galpon.granja.propietario_id,
        'Solo puedes ver movimientos de tus propios lotes',
      );
    }
    return movimiento;
  }

  async actualizar(
    id: number,
    dto: UpdateMovimientoFinancieroDto,
    solicitante: Solicitante,
  ) {
    await this.obtener(id, solicitante);

    if (dto.categoria_id) {
      await this.validarCategoria(dto.categoria_id);
    }
    if (dto.lote_id) {
      await this.validarLote(dto.lote_id, solicitante);
    }

    return this.prisma.movimientoFinanciero.update({
      where: { id },
      data: {
        categoria_id: dto.categoria_id,
        tipo: dto.tipo,
        valor_cop: dto.valor_cop,
        fecha: dto.fecha ? new Date(dto.fecha) : undefined,
        lote_id: dto.lote_id,
        proveedor_id: dto.proveedor_id,
        descripcion: dto.descripcion,
        numero_factura: dto.numero_factura,
        metodo_pago: dto.metodo_pago,
      },
      select: MOVIMIENTO_SELECT,
    });
  }

  async eliminar(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante);

    await this.prisma.movimientoFinanciero.delete({ where: { id } });
    return { id, eliminado: true };
  }
}
