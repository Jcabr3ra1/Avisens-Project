import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLoteDto } from './dto/create-lote.dto';
import { UpdateLoteDto } from './dto/update-lote.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';
import { verificarDueno } from '../../common/auth/acceso';
import { Solicitante } from '../../common/auth/acceso';
import { filtroLotes, verificarAccesoLote } from '../../common/auth/alcance';
import { randomUUID } from 'node:crypto';

const LOTE_SELECT = {
  id: true,
  codigo: true,
  fecha_ingreso: true,
  cantidad_inicial: true,
  raza: true,
  sexo: true,
  marca_alimento: true,
  costo_pollito_unitario: true,
  presupuesto_total_cop: true,
  fecha_salida_estimada: true,
  fecha_salida_real: true,
  estado: true,
  galpon: {
    select: {
      id: true,
      nombre: true,
      granja: { select: { id: true, nombre: true, propietario_id: true } },
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
    if (dto.proveedor_id !== undefined && dto.proveedor_id !== null) {
      await this.validarProveedor(dto.proveedor_id);
    }

    return this.prisma.$transaction(async (transaccion) => {
      const creado = await transaccion.lote.create({
        data: {
          galpon_id: dto.galpon_id,
          proveedor_id: dto.proveedor_id ?? null,
          codigo: `TEMP-${randomUUID()}`,
          fecha_ingreso: new Date(dto.fecha_ingreso),
          cantidad_inicial: dto.cantidad_inicial,
          raza: dto.raza,
          sexo: dto.sexo,
          marca_alimento: dto.marca_alimento,
          costo_pollito_unitario: dto.costo_pollito_unitario,
          presupuesto_total_cop: dto.presupuesto_total_cop,
          fecha_salida_estimada: dto.fecha_salida_estimada
            ? new Date(dto.fecha_salida_estimada)
            : undefined,
        },
        select: { id: true },
      });

      const anioIngreso = new Date(dto.fecha_ingreso).getUTCFullYear();

      return transaccion.lote.update({
        where: { id: creado.id },
        data: {
          codigo: `LOT-${anioIngreso}-${String(creado.id).padStart(6, '0')}`,
        },
        select: LOTE_SELECT,
      });
    });
  }

  async listar(solicitante: Solicitante, { page, limit }: PaginationQueryDto) {
    const where = filtroLotes(solicitante);

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
    await verificarAccesoLote(
      this.prisma,
      id,
      solicitante,
      'Solo puedes gestionar lotes de tus propios galpones',
      lote.galpon.granja.propietario_id,
    );
    return lote;
  }

  async actualizar(id: number, dto: UpdateLoteDto, solicitante: Solicitante) {
    const actual = await this.obtener(id, solicitante);

    if (dto.galpon_id !== undefined && dto.galpon_id !== actual.galpon.id) {
      throw new BadRequestException(
        'No se puede trasladar un lote a otro galpón; crea un lote nuevo para conservar la integridad histórica',
      );
    }
    if (dto.proveedor_id !== undefined && dto.proveedor_id !== null) {
      await this.validarProveedor(dto.proveedor_id);
    }

    return this.prisma.lote.update({
      where: { id },
      data: {
        galpon_id: undefined,
        proveedor_id: dto.proveedor_id,
        fecha_ingreso: dto.fecha_ingreso
          ? new Date(dto.fecha_ingreso)
          : undefined,
        cantidad_inicial: dto.cantidad_inicial,
        raza: dto.raza,
        sexo: dto.sexo,
        marca_alimento: dto.marca_alimento,
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
