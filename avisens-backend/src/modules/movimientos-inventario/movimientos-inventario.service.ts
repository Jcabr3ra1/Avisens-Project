import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/pagination/paginate';
import type { Solicitante } from '../../common/auth/acceso';
import { filtroGranjas } from '../../common/auth/alcance';
import { InsumosService } from '../insumos/insumos.service';
import {
  CreateMovimientoInventarioDto,
  ListarMovimientosInventarioDto,
} from './dto/create-movimiento-inventario.dto';

const SELECT = {
  id: true,
  insumo_id: true,
  lote_id: true,
  tipo_movimiento: true,
  cantidad: true,
  unidad_medida: true,
  motivo: true,
  stock_resultante: true,
  usuario_id: true,
  fecha_movimiento: true,
  insumo: { select: { id: true, nombre: true, tipo: true } },
  lote: { select: { id: true, codigo: true } },
} as const;

@Injectable()
export class MovimientosInventarioService {
  constructor(
    private prisma: PrismaService,
    private insumosService: InsumosService,
  ) {}

  async crear(dto: CreateMovimientoInventarioDto, solicitante: Solicitante) {
    return this.insumosService.registrarMovimiento(
      dto.insumo_id,
      {
        tipo_movimiento: dto.tipo_movimiento,
        cantidad: dto.cantidad,
        lote_id: dto.lote_id,
        motivo: dto.motivo,
        comprobante_url: dto.comprobante_url,
      },
      solicitante,
    );
  }

  async listar(
    solicitante: Solicitante,
    {
      page,
      limit,
      insumo_id,
      lote_id,
      tipo_movimiento,
    }: ListarMovimientosInventarioDto,
  ) {
    const granja = filtroGranjas(solicitante);
    const where = {
      ...(insumo_id !== undefined ? { insumo_id } : {}),
      ...(lote_id !== undefined ? { lote_id } : {}),
      ...(tipo_movimiento !== undefined ? { tipo_movimiento } : {}),
      // filtroGranjas resuelve los tres roles; comparar contra
      // propietario_id dejaba al operario con la lista vacia, porque su id
      // nunca es el del dueno de la granja.
      ...(granja ? { insumo: { granja } } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.movimientoInventario.findMany({
        where,
        select: SELECT,
        orderBy: { fecha_movimiento: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.movimientoInventario.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  async obtener(id: number, solicitante: Solicitante) {
    const granja = filtroGranjas(solicitante);
    const mov = await this.prisma.movimientoInventario.findFirst({
      where: {
        id,
        ...(granja ? { insumo: { granja } } : {}),
      },
      select: SELECT,
    });
    if (!mov)
      throw new NotFoundException(`Movimiento con ID ${id} no encontrado`);
    return mov;
  }
}
