import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLoteDto } from './dto/create-lote.dto';
import { UpdateLoteDto } from './dto/update-lote.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';
import { esPropietario, verificarDueno } from '../../common/acceso';
import { Solicitante } from '../../common/acceso';

const LOTE_SELECT = {
  id: true,
  codigo: true,
  fecha_ingreso: true,
  cantidad_inicial: true,
  raza: true,
  sexo: true,
  costo_pollito_unitario: true,
  presupuesto_total_cop: true,
  fecha_salida_estimada: true,
  fecha_salida_real: true,
  estado: true,
  galpon: {
    select: {
      id: true,
      nombre: true,
      granja: { select: { id: true, propietario_id: true } },
    },
  },
  proveedor: { select: { id: true, nombre: true } },
} as const;

@Injectable()
export class LotesService {
  constructor(private prisma: PrismaService) {}

  private async validarGalpon(galponId: number, solicitante: Solicitante) {
    const galpon = await this.prisma.galpon.findUnique({
      where: { id: galponId },
      select: { id: true, granja: { select: { propietario_id: true } } },
    });

    if (!galpon) throw new NotFoundException(`Galpon no encontrado`);
    verificarDueno(
      solicitante,
      galpon.granja.propietario_id,
      'Solo puedes gestionar lotes de tus propios galpones',
    );
  }

  private async validarProveedor(proveedorId: number) {
    const proveedor = await this.prisma.proveedor.findUnique({
      where: { id: proveedorId },
      select: { id: true },
    });

    if (!proveedor) throw new NotFoundException(`Proveedor no encontrado`);
  }

  async crear(dto: CreateLoteDto, solicitante: Solicitante) {
    await this.validarGalpon(dto.galpon_id, solicitante);
    await this.validarProveedor(dto.proveedor_id);

    return this.prisma.lote.create({
      data: {
        galpon_id: dto.galpon_id,
        proveedor_id: dto.proveedor_id,
        codigo: dto.codigo,
        fecha_ingreso: new Date(dto.fecha_ingreso),
        cantidad_inicial: dto.cantidad_inicial,
        raza: dto.raza,
        sexo: dto.sexo,
        costo_pollito_unitario: dto.costo_pollito_unitario,
        presupuesto_total_cop: dto.presupuesto_total_cop,
        fecha_salida_estimada: dto.fecha_salida_estimada
          ? new Date(dto.fecha_salida_estimada)
          : undefined,
      },
      select: LOTE_SELECT,
    });
  }

  async listar(solicitante: Solicitante, { page, limit }: PaginationQueryDto) {
    const where = esPropietario(solicitante)
      ? { galpon: { granja: { propietario_id: solicitante.id } } }
      : undefined;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.lote.findMany({
        where,
        select: LOTE_SELECT,
        orderBy: { id: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.lote.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async obtener(id: number, solicitante: Solicitante) {
    const lote = await this.prisma.lote.findUnique({
      where: { id },
      select: LOTE_SELECT,
    });
    if (!lote) throw new NotFoundException('Lote no encontrado');
    verificarDueno(
      solicitante,
      lote.galpon.granja.propietario_id,
      'Solo puedes gestionar lotes de tus propios galpones',
    );
    return lote;
  }

  async actualizar(id: number, dto: UpdateLoteDto, solicitante: Solicitante) {
    await this.obtener(id, solicitante);

    if (dto.galpon_id) {
      await this.validarGalpon(dto.galpon_id, solicitante);
    }
    if (dto.proveedor_id) {
      await this.validarProveedor(dto.proveedor_id);
    }

    return this.prisma.lote.update({
      where: { id },
      data: {
        galpon_id: dto.galpon_id,
        proveedor_id: dto.proveedor_id,
        codigo: dto.codigo,
        fecha_ingreso: dto.fecha_ingreso
          ? new Date(dto.fecha_ingreso)
          : undefined,
        cantidad_inicial: dto.cantidad_inicial,
        raza: dto.raza,
        sexo: dto.sexo,
        costo_pollito_unitario: dto.costo_pollito_unitario,
        presupuesto_total_cop: dto.presupuesto_total_cop,
        fecha_salida_estimada: dto.fecha_salida_estimada
          ? new Date(dto.fecha_salida_estimada)
          : undefined,
        fecha_salida_real: dto.fecha_salida_real
          ? new Date(dto.fecha_salida_real)
          : undefined,
        estado: dto.estado,
      },
      select: LOTE_SELECT,
    });
  }
  async desactivar(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante);
    return this.prisma.lote.update({
      where: { id },
      data: { estado: 'inactivo' },
      select: LOTE_SELECT,
    });
  }

  async activar(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante);
    return this.prisma.lote.update({
      where: { id },
      data: { estado: 'activo' },
      select: LOTE_SELECT,
    });
  }

  async eliminarPermanente(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante);

    await this.prisma.lote.delete({ where: { id } });
    return { id, eliminado: true };
  }
}
