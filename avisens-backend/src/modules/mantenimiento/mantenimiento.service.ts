import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TipoMovimientoInventario } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMantenimientoDto } from './dto/create-mantenimiento.dto';
import { UpdateMantenimientoDto } from './dto/update-mantenimiento.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';
import { esPropietario, verificarDueno } from '../../common/auth/acceso';
import type { Solicitante } from '../../common/auth/acceso';
import { AgregarRepuestoDto } from './dto/agregar-repuesto.dto';

type StockBloqueado = { stock_actual: Prisma.Decimal };
type RepuestoBloqueado = {
  id: number;
  insumo_id: number;
  cantidad: Prisma.Decimal;
  unidad_medida: string;
  revertido: boolean;
};

@Injectable()
export class MantenimientoService {
  constructor(private readonly prisma: PrismaService) {}

  private async validarEquipo(equipoId: number, solicitante: Solicitante) {
    const equipo = await this.prisma.equipo.findUnique({
      where: { id: equipoId },
      include: {
        galpon: {
          include: {
            granja: true,
          },
        },
      },
    });

    if (!equipo) {
      throw new NotFoundException(`El equipo con ID ${equipoId} no existe`);
    }

    verificarDueno(
      solicitante,
      equipo.galpon.granja.propietario_id,
      'No tienes acceso a este equipo',
    );

    return equipo;
  }

  async create(createDto: CreateMantenimientoDto, solicitante: Solicitante) {
    const { fecha_programada, fecha_ejecucion, equipo_id, ...data } = createDto;

    if (!fecha_programada) {
      throw new BadRequestException('La fecha programada es obligatoria');
    }

    await this.validarEquipo(equipo_id, solicitante);

    return this.prisma.mantenimiento.create({
      data: {
        ...data,
        equipo_id,
        fecha_programada: new Date(fecha_programada),
        ...(fecha_ejecucion && {
          fecha_ejecucion: new Date(fecha_ejecucion),
        }),
      },
      include: {
        equipo: true,
      },
    });
  }

  async findAll(solicitante: Solicitante, { page, limit }: PaginationQueryDto) {
    const where = esPropietario(solicitante)
      ? {
          equipo: {
            galpon: {
              granja: {
                propietario_id: solicitante.id,
              },
            },
          },
        }
      : {};

    const [data, total] = await this.prisma.$transaction([
      this.prisma.mantenimiento.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          fecha_programada: 'desc',
        },
        include: {
          equipo: true,
        },
      }),
      this.prisma.mantenimiento.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(id: string, solicitante: Solicitante) {
    const mantenimiento = await this.prisma.mantenimiento.findUnique({
      where: {
        id: Number(id),
      },
      include: {
        equipo: {
          include: {
            galpon: {
              include: {
                granja: true,
              },
            },
          },
        },
        repuestos: {
          include: { insumo: true },
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!mantenimiento) {
      throw new NotFoundException(
        `No se encontró el mantenimiento con ID ${id}`,
      );
    }

    verificarDueno(
      solicitante,
      mantenimiento.equipo.galpon.granja.propietario_id,
      'No tienes acceso a este mantenimiento',
    );

    return mantenimiento;
  }

  async update(
    id: string,
    updateDto: UpdateMantenimientoDto,
    solicitante: Solicitante,
  ) {
    await this.findOne(id, solicitante);

    if (updateDto.equipo_id !== undefined) {
      const repuestos = await this.prisma.mantenimientoRepuesto.count({
        where: { mantenimiento_id: Number(id) },
      });
      if (repuestos > 0) {
        throw new BadRequestException(
          'No se puede cambiar el equipo después de consumir repuestos',
        );
      }
      await this.validarEquipo(updateDto.equipo_id, solicitante);
    }

    const { fecha_programada, fecha_ejecucion, ...data } = updateDto;

    return this.prisma.mantenimiento.update({
      where: {
        id: Number(id),
      },
      data: {
        ...data,

        ...(fecha_programada && {
          fecha_programada: new Date(fecha_programada),
        }),

        ...(fecha_ejecucion && {
          fecha_ejecucion: new Date(fecha_ejecucion),
        }),
      },
      include: {
        equipo: true,
      },
    });
  }

  async remove(id: string, solicitante: Solicitante) {
    await this.findOne(id, solicitante);

    const repuestos = await this.prisma.mantenimientoRepuesto.count({
      where: { mantenimiento_id: Number(id) },
    });
    if (repuestos > 0) {
      throw new BadRequestException(
        'Un mantenimiento con repuestos conserva su historial y no se puede eliminar',
      );
    }

    await this.prisma.mantenimiento.delete({
      where: {
        id: Number(id),
      },
    });

    return {
      message: 'Mantenimiento eliminado correctamente',
      id: Number(id),
    };
  }

  async agregarRepuesto(
    mantenimientoId: number,
    dto: AgregarRepuestoDto,
    solicitante: Solicitante,
  ) {
    const mantenimiento = await this.findOne(
      String(mantenimientoId),
      solicitante,
    );
    const estado = mantenimiento.estado.trim().toLowerCase();
    if (['cancelado', 'completo', 'completado', 'realizado'].includes(estado)) {
      throw new BadRequestException(
        'No se pueden agregar repuestos a un mantenimiento cerrado',
      );
    }

    const clave = dto.clave_idempotencia.trim();
    const cantidad = new Prisma.Decimal(dto.cantidad);
    const existente = await this.prisma.mantenimientoRepuesto.findUnique({
      where: {
        mantenimiento_id_clave_idempotencia: {
          mantenimiento_id: mantenimientoId,
          clave_idempotencia: clave,
        },
      },
      include: { insumo: true },
    });
    if (existente) {
      if (
        existente.insumo_id !== dto.insumo_id ||
        !existente.cantidad.eq(cantidad)
      ) {
        throw new BadRequestException(
          'La clave idempotente ya se usó con otros datos',
        );
      }
      return { idempotente: true, repuesto: existente };
    }

    const insumo = await this.prisma.inventarioInsumo.findUnique({
      where: { id: dto.insumo_id },
      select: {
        id: true,
        granja_id: true,
        unidad_medida: true,
        activo: true,
      },
    });
    if (!insumo) throw new NotFoundException('Insumo no encontrado');
    if (!insumo.activo)
      throw new BadRequestException('El insumo está inactivo');
    if (insumo.granja_id !== mantenimiento.equipo.galpon.granja.id) {
      throw new BadRequestException(
        'El repuesto no pertenece a la granja del equipo',
      );
    }

    try {
      const repuesto = await this.prisma.$transaction(async (tx) => {
        const [fila] = await tx.$queryRaw<StockBloqueado[]>`
        SELECT "stock_actual" FROM "inventario_insumos"
        WHERE "id" = ${dto.insumo_id} FOR UPDATE
      `;
        if (!fila) throw new NotFoundException('Insumo no encontrado');
        const stockActual = new Prisma.Decimal(fila.stock_actual);
        const stockResultante = stockActual.minus(cantidad);
        if (stockResultante.isNegative()) {
          throw new BadRequestException(
            `No hay stock suficiente: hay ${stockActual.toString()} y se requieren ${cantidad.toString()}`,
          );
        }

        await tx.inventarioInsumo.update({
          where: { id: dto.insumo_id },
          data: { stock_actual: stockResultante },
        });
        const movimiento = await tx.movimientoInventario.create({
          data: {
            insumo_id: dto.insumo_id,
            tipo_movimiento: TipoMovimientoInventario.salida,
            cantidad,
            unidad_medida: insumo.unidad_medida,
            motivo: `Repuesto mantenimiento ${mantenimientoId}`,
            stock_resultante: stockResultante,
            usuario_id: solicitante.id,
          },
        });
        return tx.mantenimientoRepuesto.create({
          data: {
            mantenimiento_id: mantenimientoId,
            insumo_id: dto.insumo_id,
            descripcion: dto.descripcion,
            cantidad,
            unidad_medida: insumo.unidad_medida,
            costo_cop: dto.costo_cop,
            clave_idempotencia: clave,
            movimiento_salida_id: movimiento.id,
          },
          include: { insumo: true },
        });
      });
      return { idempotente: false, repuesto };
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        const duplicado = await this.prisma.mantenimientoRepuesto.findUnique({
          where: {
            mantenimiento_id_clave_idempotencia: {
              mantenimiento_id: mantenimientoId,
              clave_idempotencia: clave,
            },
          },
          include: { insumo: true },
        });
        if (
          duplicado &&
          duplicado.insumo_id === dto.insumo_id &&
          duplicado.cantidad.eq(cantidad)
        ) {
          return { idempotente: true, repuesto: duplicado };
        }
        throw new ConflictException(
          'La clave idempotente ya se usó con otros datos',
        );
      }
      throw error;
    }
  }

  async listarRepuestos(mantenimientoId: number, solicitante: Solicitante) {
    await this.findOne(String(mantenimientoId), solicitante);
    return this.prisma.mantenimientoRepuesto.findMany({
      where: { mantenimiento_id: mantenimientoId },
      include: { insumo: true },
      orderBy: { id: 'asc' },
    });
  }

  async revertirRepuesto(
    mantenimientoId: number,
    repuestoId: number,
    solicitante: Solicitante,
  ) {
    await this.findOne(String(mantenimientoId), solicitante);
    const repuesto = await this.prisma.mantenimientoRepuesto.findFirst({
      where: { id: repuestoId, mantenimiento_id: mantenimientoId },
      select: { id: true },
    });
    if (!repuesto) throw new NotFoundException('Repuesto no encontrado');

    return this.prisma.$transaction(async (tx) => {
      const [bloqueado] = await tx.$queryRaw<RepuestoBloqueado[]>`
        SELECT "id", "insumo_id", "cantidad", "unidad_medida", "revertido"
        FROM "mantenimientos_repuestos"
        WHERE "id" = ${repuestoId} AND "mantenimiento_id" = ${mantenimientoId}
        FOR UPDATE
      `;
      if (!bloqueado) throw new NotFoundException('Repuesto no encontrado');
      if (bloqueado.revertido) {
        throw new BadRequestException(
          'El consumo del repuesto ya fue revertido',
        );
      }

      const [fila] = await tx.$queryRaw<StockBloqueado[]>`
        SELECT "stock_actual" FROM "inventario_insumos"
        WHERE "id" = ${bloqueado.insumo_id} FOR UPDATE
      `;
      if (!fila) throw new NotFoundException('Insumo no encontrado');
      const stockResultante = new Prisma.Decimal(fila.stock_actual).plus(
        bloqueado.cantidad,
      );
      await tx.inventarioInsumo.update({
        where: { id: bloqueado.insumo_id },
        data: { stock_actual: stockResultante },
      });
      const movimiento = await tx.movimientoInventario.create({
        data: {
          insumo_id: bloqueado.insumo_id,
          tipo_movimiento: TipoMovimientoInventario.entrada,
          cantidad: bloqueado.cantidad,
          unidad_medida: bloqueado.unidad_medida,
          motivo: `Reversión repuesto mantenimiento ${mantenimientoId}`,
          stock_resultante: stockResultante,
          usuario_id: solicitante.id,
        },
      });
      return tx.mantenimientoRepuesto.update({
        where: { id: repuestoId },
        data: {
          revertido: true,
          movimiento_reversion_id: movimiento.id,
        },
        include: { insumo: true },
      });
    });
  }
}
