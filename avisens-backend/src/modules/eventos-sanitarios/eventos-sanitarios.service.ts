import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TipoMovimientoInventario } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEventoSanitarioDto } from './dto/create-evento-sanitario.dto';
import { UpdateEventoSanitarioDto } from './dto/update-evento-sanitario.dto';
import { FinalizarCasoSanitarioDto } from './dto/finalizar-caso-sanitario.dto';
import { ListarEventosSanitariosDto } from './dto/listar-eventos-sanitarios.dto';
import { paginate } from '../../common/pagination/paginate';
import { Solicitante } from '../../common/auth/acceso';
import {
  filtroRegistrosDeLote,
  verificarAccesoLote,
} from '../../common/auth/alcance';

type StockBloqueado = { stock_actual: Prisma.Decimal };

const SANITARIO_SELECT = {
  id: true,
  lote_id: true,
  evento_padre_id: true,
  estado: true,
  fecha_cierre: true,
  observaciones_cierre: true,
  insumo_id: true,
  cantidad_insumo: true,
  movimiento_inventario_id: true,
  tipo: true,
  diagnostico: true,
  producto: true,
  dosis: true,
  via_aplicacion: true,
  cantidad_aves: true,
  fecha: true,
  usuario_id: true,
  metodo_registro: true,
  observaciones: true,
  fecha_registro: true,
  lote: {
    select: {
      id: true,
      codigo: true,
      galpon: {
        select: { granja: { select: { id: true, propietario_id: true } } },
      },
    },
  },
  insumo: { select: { id: true, nombre: true, unidad_medida: true } },
  caso_padre: { select: { id: true, tipo: true, diagnostico: true, estado: true } },
  _count: { select: { seguimientos: true } },
} as const;

@Injectable()
export class EventosSanitariosService {
  constructor(private prisma: PrismaService) {}

  private async validarLote(loteId: number, solicitante: Solicitante) {
    const lote = await this.prisma.lote.findUnique({
      where: { id: loteId },
      select: {
        id: true,
        galpon: {
          select: { granja: { select: { id: true, propietario_id: true } } },
        },
      },
    });

    if (!lote) throw new NotFoundException('Lote no encontrado');
    await verificarAccesoLote(
      this.prisma,
      loteId,
      solicitante,
      'Solo puedes registrar eventos sanitarios de tus propios lotes',
      lote.galpon.granja.propietario_id,
    );
    return lote.galpon.granja.id;
  }

  private async validarInsumo(insumoId: number, granjaId: number) {
    const insumo = await this.prisma.inventarioInsumo.findFirst({
      where: { id: insumoId, granja_id: granjaId, activo: true },
      select: { id: true, nombre: true, unidad_medida: true },
    });

    if (!insumo) {
      throw new NotFoundException(
        'Insumo no encontrado, inactivo o perteneciente a otra granja',
      );
    }
    return insumo;
  }

  private async validarCasoPadre(eventoPadreId: number, loteId: number) {
    const padre = await this.prisma.eventoSanitario.findUnique({
      where: { id: eventoPadreId },
      select: { id: true, lote_id: true, evento_padre_id: true, estado: true },
    });

    if (!padre) {
      throw new NotFoundException('Caso sanitario principal no encontrado');
    }
    if (padre.lote_id !== loteId) {
      throw new BadRequestException(
        'El seguimiento debe pertenecer al mismo lote que el caso sanitario principal',
      );
    }
    if (padre.evento_padre_id !== null) {
      throw new BadRequestException(
        'No se puede anidar un seguimiento dentro de otro seguimiento',
      );
    }
    if (padre.estado === 'finalizado') {
      throw new BadRequestException(
        'No se pueden agregar seguimientos a un caso sanitario ya finalizado',
      );
    }
  }

  async crear(dto: CreateEventoSanitarioDto, solicitante: Solicitante) {
    if (dto.cantidad_insumo !== undefined && dto.insumo_id === undefined) {
      throw new BadRequestException(
        'Debes indicar el insumo de bodega para descontar una cantidad',
      );
    }

    const granjaId = await this.validarLote(dto.lote_id, solicitante);
    if (dto.evento_padre_id !== undefined) {
      await this.validarCasoPadre(dto.evento_padre_id, dto.lote_id);
    }
    const insumo = dto.insumo_id
      ? await this.validarInsumo(dto.insumo_id, granjaId)
      : null;

    const datosBase = {
      lote_id: dto.lote_id,
      evento_padre_id: dto.evento_padre_id,
      insumo_id: dto.insumo_id,
      usuario_id: solicitante.id,
      tipo: dto.tipo,
      diagnostico: dto.diagnostico,
      producto: dto.producto,
      dosis: dto.dosis,
      via_aplicacion: dto.via_aplicacion,
      cantidad_aves: dto.cantidad_aves,
      fecha: new Date(dto.fecha),
      metodo_registro: dto.metodo_registro,
      observaciones: dto.observaciones,
    };

    if (insumo && dto.cantidad_insumo !== undefined) {
      const cantidad = new Prisma.Decimal(dto.cantidad_insumo);
      return this.prisma.$transaction(async (tx) => {
        const [fila] = await tx.$queryRaw<StockBloqueado[]>`
          SELECT "stock_actual" FROM "inventario_insumos"
          WHERE "id" = ${insumo.id} FOR UPDATE
        `;
        if (!fila) throw new NotFoundException('Insumo no encontrado');

        const stockActual = new Prisma.Decimal(fila.stock_actual);
        const stockResultante = stockActual.minus(cantidad);
        if (stockResultante.isNegative()) {
          throw new BadRequestException(
            `No hay stock suficiente en bodega para ${insumo.nombre}: hay ${stockActual.toString()} ${insumo.unidad_medida} y se requieren ${cantidad.toString()}`,
          );
        }

        await tx.inventarioInsumo.update({
          where: { id: insumo.id },
          data: { stock_actual: stockResultante },
        });

        const detalleProducto = dto.producto ? `: ${dto.producto}` : '';
        const movimiento = await tx.movimientoInventario.create({
          data: {
            insumo_id: insumo.id,
            lote_id: dto.lote_id,
            tipo_movimiento: TipoMovimientoInventario.salida,
            cantidad,
            unidad_medida: insumo.unidad_medida,
            motivo: `Evento sanitario (${dto.tipo})${detalleProducto}`,
            stock_resultante: stockResultante,
            usuario_id: solicitante.id,
          },
        });

        return tx.eventoSanitario.create({
          data: {
            ...datosBase,
            cantidad_insumo: cantidad,
            movimiento_inventario_id: movimiento.id,
          },
          select: SANITARIO_SELECT,
        });
      });
    }

    return this.prisma.eventoSanitario.create({
      data: datosBase,
      select: SANITARIO_SELECT,
    });
  }

  async listar(solicitante: Solicitante, query: ListarEventosSanitariosDto) {
    const { page, limit, lote_id, estado, solo_casos } = query;
    const base = filtroRegistrosDeLote(solicitante);
    const filtrosExtra: Prisma.EventoSanitarioWhereInput = {};
    if (lote_id !== undefined) filtrosExtra.lote_id = lote_id;
    if (estado !== undefined) filtrosExtra.estado = estado;
    if (solo_casos === true) filtrosExtra.evento_padre_id = null;

    const hayExtra = Object.keys(filtrosExtra).length > 0;
    const where: Prisma.EventoSanitarioWhereInput | undefined =
      base || hayExtra ? { ...(base ?? {}), ...filtrosExtra } : undefined;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.eventoSanitario.findMany({
        where,
        select: SANITARIO_SELECT,
        orderBy: { fecha: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.eventoSanitario.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async obtener(id: number, solicitante: Solicitante) {
    const evento = await this.prisma.eventoSanitario.findUnique({
      where: { id },
      select: SANITARIO_SELECT,
    });

    if (!evento) throw new NotFoundException('Evento sanitario no encontrado');
    await verificarAccesoLote(
      this.prisma,
      evento.lote_id,
      solicitante,
      'Solo puedes ver eventos sanitarios de tus propios lotes',
      evento.lote.galpon.granja.propietario_id,
    );
    return evento;
  }

  async listarSeguimientos(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante);
    return this.prisma.eventoSanitario.findMany({
      where: { evento_padre_id: id },
      select: SANITARIO_SELECT,
      orderBy: [{ fecha: 'asc' }, { id: 'asc' }],
    });
  }

  async finalizar(
    id: number,
    dto: FinalizarCasoSanitarioDto,
    solicitante: Solicitante,
  ) {
    const actual = await this.obtener(id, solicitante);
    if (actual.evento_padre_id !== null && actual.evento_padre_id !== undefined) {
      throw new BadRequestException(
        'Solo se puede finalizar el caso sanitario principal, no un seguimiento',
      );
    }
    if (actual.estado === 'finalizado') {
      throw new ConflictException('Este caso sanitario ya está finalizado');
    }

    return this.prisma.eventoSanitario.update({
      where: { id },
      data: {
        estado: 'finalizado',
        fecha_cierre: dto.fecha_cierre ? new Date(dto.fecha_cierre) : new Date(),
        observaciones_cierre: dto.observaciones_cierre,
      },
      select: SANITARIO_SELECT,
    });
  }

  async actualizar(
    id: number,
    dto: UpdateEventoSanitarioDto,
    solicitante: Solicitante,
  ) {
    const actual = await this.obtener(id, solicitante);
    const granjaId = await this.validarLote(
      dto.lote_id ?? actual.lote_id,
      solicitante,
    );
    if (dto.insumo_id) {
      await this.validarInsumo(dto.insumo_id, granjaId);
    }

    return this.prisma.eventoSanitario.update({
      where: { id },
      data: {
        lote_id: dto.lote_id,
        insumo_id: dto.insumo_id,
        tipo: dto.tipo,
        diagnostico: dto.diagnostico,
        producto: dto.producto,
        dosis: dto.dosis,
        via_aplicacion: dto.via_aplicacion,
        cantidad_aves: dto.cantidad_aves,
        fecha: dto.fecha ? new Date(dto.fecha) : undefined,
        metodo_registro: dto.metodo_registro,
        observaciones: dto.observaciones,
      },
      select: SANITARIO_SELECT,
    });
  }

  async eliminar(id: number, solicitante: Solicitante) {
    const actual = await this.obtener(id, solicitante);
    if ((actual._count?.seguimientos ?? 0) > 0) {
      throw new ConflictException(
        'No se puede eliminar un caso sanitario que tiene seguimientos registrados',
      );
    }

    if (
      actual.movimiento_inventario_id &&
      actual.insumo_id &&
      actual.cantidad_insumo !== null &&
      actual.cantidad_insumo !== undefined
    ) {
      const insumoId = actual.insumo_id;
      const cantidad = new Prisma.Decimal(actual.cantidad_insumo);
      await this.prisma.$transaction(async (tx) => {
        const [fila] = await tx.$queryRaw<StockBloqueado[]>`
          SELECT "stock_actual" FROM "inventario_insumos"
          WHERE "id" = ${insumoId} FOR UPDATE
        `;
        if (fila) {
          const stockResultante = new Prisma.Decimal(fila.stock_actual).plus(
            cantidad,
          );
          await tx.inventarioInsumo.update({
            where: { id: insumoId },
            data: { stock_actual: stockResultante },
          });
          await tx.movimientoInventario.create({
            data: {
              insumo_id: insumoId,
              lote_id: actual.lote_id,
              tipo_movimiento: TipoMovimientoInventario.entrada,
              cantidad,
              unidad_medida: actual.insumo?.unidad_medida ?? undefined,
              motivo: `Reversión evento sanitario #${id}`,
              stock_resultante: stockResultante,
              usuario_id: solicitante.id,
            },
          });
        }
        await tx.eventoSanitario.delete({ where: { id } });
      });
      return { id, eliminado: true, stock_revertido: true };
    }

    await this.prisma.eventoSanitario.delete({ where: { id } });
    return { id, eliminado: true };
  }
}
