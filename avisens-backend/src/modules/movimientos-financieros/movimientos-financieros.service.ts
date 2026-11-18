import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CreateMovimientoFinancieroDto } from './dto/create-movimiento-financiero.dto';
import { UpdateMovimientoFinancieroDto } from './dto/update-movimiento-financiero.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';
import { ReporteFinancieroQueryDto } from './dto/reporte-financiero-query.dto';
import {
  AlcanceReporte,
  armarReporte,
  LoteDelReporte,
  ReporteFinanciero,
} from './reporte-financiero';
import {
  esPropietario,
  verificarDueno,
  Solicitante,
} from '../../common/auth/acceso';

const SIN_ACCESO = 'Solo puedes gestionar movimientos de tus propias granjas';

/** Dos años: más que eso deja de ser un reporte de ciclo y se vuelve lento. */
const DIAS_MAXIMOS_REPORTE = 731;
const MS_POR_DIA = 24 * 60 * 60 * 1000;

const MOVIMIENTO_SELECT = {
  id: true,
  granja_id: true,
  lote_id: true,
  categoria_id: true,
  proveedor_id: true,
  tipo: true,
  valor_cop: true,
  fecha: true,
  descripcion: true,
  numero_factura: true,
  comprobante_url: true,
  metodo_pago: true,
  usuario_id: true,
  fecha_registro: true,
  granja: {
    select: { id: true, nombre: true, propietario_id: true },
  },
  categoria: { select: { id: true, nombre: true, tipo: true } },
  lote: { select: { id: true, codigo: true } },
} as const;

@Injectable()
export class MovimientosFinancierosService {
  private readonly logger = new Logger(MovimientosFinancierosService.name);

  constructor(
    private prisma: PrismaService,
    private auditoria: AuditoriaService,
  ) {}

  /**
   * Deja constancia de que alguien que no es el dueño miró estas cuentas.
   *
   * El administrador ve los movimientos de todos los propietarios, y eso es a
   * propósito: en un servicio gestionado a veces tiene que mirar las cuentas de
   * un cliente para ayudarlo. Lo que protege al cliente no es esconderlo —la
   * ruta está abierta de todos modos— sino que quede rastro de quién miró qué
   * y cuándo.
   *
   * La bitácora sólo guardaba escrituras: el interceptor mapea POST, PATCH,
   * PUT y DELETE, y deja fuera el GET. Por eso se registra aquí a mano.
   */
  private async registrarConsultaAjena(
    solicitante: Solicitante,
    detalle: Record<string, unknown>,
  ) {
    if (esPropietario(solicitante)) return;
    // Si la bitácora falla, se pierde el rastro de esta consulta, pero la
    // consulta se responde igual: la auditoría no puede convertirse en un
    // punto de caída de una ruta que sí funciona.
    try {
      await this.auditoria.registrar({
        usuario_id: solicitante.id,
        accion: 'consultar',
        entidad_afectada: 'movimientos_financieros',
        registro_id: typeof detalle.id === 'number' ? detalle.id : null,
        datos_despues: detalle,
      });
    } catch (error) {
      this.logger.error(
        'No se pudo registrar la consulta de cuentas ajenas',
        error as Error,
      );
    }
  }

  private async resolverGranja(
    granjaId: number | undefined,
    loteId: number | undefined,
    solicitante: Solicitante,
  ): Promise<number> {
    if (loteId !== undefined) {
      const lote = await this.prisma.lote.findUnique({
        where: { id: loteId },
        select: {
          id: true,
          galpon: {
            select: {
              granja: {
                select: { id: true, propietario_id: true },
              },
            },
          },
        },
      });

      if (!lote) {
        throw new NotFoundException('Lote no encontrado');
      }

      const granjaDelLote = lote.galpon.granja;
      verificarDueno(solicitante, granjaDelLote.propietario_id, SIN_ACCESO);

      if (granjaId !== undefined && granjaId !== granjaDelLote.id) {
        throw new BadRequestException(
          'El lote seleccionado no pertenece a la granja indicada',
        );
      }

      return granjaDelLote.id;
    }

    if (granjaId === undefined) {
      throw new BadRequestException(
        'Debes indicar granja_id cuando el movimiento no tiene lote',
      );
    }

    const granja = await this.prisma.granja.findUnique({
      where: { id: granjaId },
      select: { id: true, propietario_id: true },
    });

    if (!granja) {
      throw new NotFoundException('Granja no encontrada');
    }

    verificarDueno(solicitante, granja.propietario_id, SIN_ACCESO);
    return granja.id;
  }

  /**
   * La categoría existe y encaja con el lado del balance del movimiento.
   *
   * Antes sólo se comprobaba que existiera, así que un ingreso con la
   * categoría «Compra de alimento» se guardaba sin protestar: el movimiento
   * sumaba de un lado y quedaba clasificado del otro, y el balance de la
   * granja salía mal sin que nadie se enterara.
   *
   * Una categoría sin tipo sirve para las dos cosas y no se rechaza: la
   * columna es opcional a propósito.
   */
  private async validarCategoria(categoriaId: number, tipo?: string) {
    const categoria = await this.prisma.categoriaFinanciera.findUnique({
      where: { id: categoriaId },
      select: { id: true, nombre: true, tipo: true },
    });

    if (!categoria) {
      throw new NotFoundException('Categoria financiera no encontrada');
    }

    if (tipo && categoria.tipo && categoria.tipo !== tipo) {
      throw new BadRequestException(
        `La categoría "${categoria.nombre}" es de ${categoria.tipo}, ` +
          `así que no puede clasificar un movimiento de ${tipo}`,
      );
    }
  }

  private async validarProveedor(proveedorId?: number) {
    if (proveedorId === undefined) return;

    const proveedor = await this.prisma.proveedor.findUnique({
      where: { id: proveedorId },
      select: { id: true },
    });

    if (!proveedor) {
      throw new NotFoundException('Proveedor no encontrado');
    }
  }

  async crear(dto: CreateMovimientoFinancieroDto, solicitante: Solicitante) {
    const granjaId = await this.resolverGranja(
      dto.granja_id,
      dto.lote_id,
      solicitante,
    );
    await this.validarCategoria(dto.categoria_id, dto.tipo);
    await this.validarProveedor(dto.proveedor_id);

    return this.prisma.movimientoFinanciero.create({
      data: {
        granja_id: granjaId,
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
      ? { granja: { propietario_id: solicitante.id } }
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

    await this.registrarConsultaAjena(solicitante, {
      alcance: 'listado',
      total,
      granjas: [...new Set(data.map((m) => m.granja.nombre))],
    });

    return paginate(data, total, page, limit);
  }

  async obtener(id: number, solicitante: Solicitante) {
    const movimiento = await this.prisma.movimientoFinanciero.findUnique({
      where: { id },
      select: MOVIMIENTO_SELECT,
    });

    if (!movimiento) {
      throw new NotFoundException('Movimiento financiero no encontrado');
    }

    verificarDueno(solicitante, movimiento.granja.propietario_id, SIN_ACCESO);

    await this.registrarConsultaAjena(solicitante, {
      alcance: 'detalle',
      id: movimiento.id,
      granja: movimiento.granja.nombre,
      valor_cop: movimiento.valor_cop,
    });

    return movimiento;
  }

  async actualizar(
    id: number,
    dto: UpdateMovimientoFinancieroDto,
    solicitante: Solicitante,
  ) {
    const movimiento = await this.obtener(id, solicitante);

    // Se valida la combinación que va a QUEDAR, no la que llega. Cambiar sólo
    // el tipo —dejando la categoría de antes— descuadra igual, y comprobar
    // nada más lo que viene en el dto dejaba pasar justo ese caso.
    const tipoResultante = dto.tipo ?? movimiento.tipo ?? undefined;
    const categoriaResultante = dto.categoria_id ?? movimiento.categoria_id;
    if (dto.categoria_id !== undefined || dto.tipo !== undefined) {
      await this.validarCategoria(categoriaResultante, tipoResultante);
    }
    await this.validarProveedor(dto.proveedor_id);

    const loteId =
      dto.lote_id !== undefined
        ? dto.lote_id
        : (movimiento.lote_id ?? undefined);
    const granjaSolicitada =
      dto.granja_id !== undefined
        ? dto.granja_id
        : dto.lote_id !== undefined
          ? undefined
          : movimiento.granja_id;
    const granjaId = await this.resolverGranja(
      granjaSolicitada,
      loteId,
      solicitante,
    );

    return this.prisma.movimientoFinanciero.update({
      where: { id },
      data: {
        granja_id: granjaId,
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

  /**
   * Reporte financiero consolidado por ciclo (HU-33): por lote —el ciclo
   * completo— o por periodo, con balance, margen neto, costo por ave y avisos
   * de datos incompletos.
   */
  async reporte(
    filtro: ReporteFinancieroQueryDto,
    solicitante: Solicitante,
  ): Promise<ReporteFinanciero> {
    const alcance = await this.resolverAlcance(filtro, solicitante);

    const where =
      alcance.tipo === 'lote'
        ? { lote_id: alcance.lote_id }
        : {
            fecha: {
              gte: new Date(`${alcance.fecha_desde}T00:00:00.000Z`),
              lte: new Date(`${alcance.fecha_hasta}T00:00:00.000Z`),
            },
            ...(alcance.granja_id !== null
              ? { granja_id: alcance.granja_id }
              : {}),
            ...(esPropietario(solicitante)
              ? { granja: { propietario_id: solicitante.id } }
              : {}),
          };

    const filas = await this.prisma.movimientoFinanciero.findMany({
      where,
      select: {
        lote_id: true,
        tipo: true,
        valor_cop: true,
        fecha: true,
        categoria: { select: { id: true, nombre: true, tipo: true } },
      },
      orderBy: { fecha: 'asc' },
    });
    const movimientos = filas.map((fila) => ({
      ...fila,
      valor_cop: Number(fila.valor_cop),
    }));

    const loteIds =
      alcance.tipo === 'lote'
        ? [alcance.lote_id]
        : [
            ...new Set(
              movimientos
                .map((movimiento) => movimiento.lote_id)
                .filter((id): id is number => id !== null),
            ),
          ];
    const lotes = await this.lotesDelReporte(loteIds);

    await this.registrarConsultaAjena(solicitante, {
      alcance: 'reporte',
      filtro: alcance,
      movimientos: movimientos.length,
    });

    return armarReporte(alcance, lotes, movimientos);
  }

  private async resolverAlcance(
    filtro: ReporteFinancieroQueryDto,
    solicitante: Solicitante,
  ): Promise<AlcanceReporte> {
    const { lote_id, granja_id, fecha_desde, fecha_hasta } = filtro;

    if (lote_id !== undefined) {
      if (fecha_desde || fecha_hasta || granja_id !== undefined) {
        throw new BadRequestException(
          'Pide el reporte por lote o por periodo, no ambos a la vez',
        );
      }
      // resolverGranja ya valida que el lote exista y sea del solicitante.
      await this.resolverGranja(undefined, lote_id, solicitante);
      return { tipo: 'lote', lote_id };
    }

    if (!fecha_desde || !fecha_hasta) {
      throw new BadRequestException(
        'Indica un lote, o la fecha inicial y final del periodo',
      );
    }
    const desde = fecha_desde.slice(0, 10);
    const hasta = fecha_hasta.slice(0, 10);
    const dias =
      (new Date(`${hasta}T00:00:00.000Z`).getTime() -
        new Date(`${desde}T00:00:00.000Z`).getTime()) /
      MS_POR_DIA;
    if (dias < 0) {
      throw new BadRequestException(
        'La fecha inicial no puede ser posterior a la final',
      );
    }
    if (dias > DIAS_MAXIMOS_REPORTE) {
      throw new BadRequestException(
        'El periodo del reporte no puede superar dos años',
      );
    }

    if (granja_id !== undefined) {
      await this.resolverGranja(granja_id, undefined, solicitante);
    }

    return {
      tipo: 'periodo',
      fecha_desde: desde,
      fecha_hasta: hasta,
      granja_id: granja_id ?? null,
    };
  }

  private async lotesDelReporte(ids: number[]): Promise<LoteDelReporte[]> {
    if (ids.length === 0) return [];

    const [lotes, mortalidad] = await Promise.all([
      this.prisma.lote.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          codigo: true,
          estado: true,
          fecha_ingreso: true,
          fecha_salida_real: true,
          cantidad_inicial: true,
          presupuesto_total_cop: true,
          galpon: { select: { granja: { select: { nombre: true } } } },
          pesajes: {
            orderBy: { fecha: 'desc' },
            take: 1,
            select: { peso_promedio_g: true, peso_objetivo_g: true },
          },
          planes: {
            where: { vigente: true },
            take: 1,
            select: { peso_objetivo_g: true },
          },
        },
        orderBy: { codigo: 'asc' },
      }),
      this.prisma.registroMortalidad.groupBy({
        by: ['lote_id'],
        where: { lote_id: { in: ids } },
        _sum: { cantidad_aves: true },
      }),
    ]);

    const muertesPorLote = new Map(
      mortalidad.map((fila) => [fila.lote_id, fila._sum.cantidad_aves ?? 0]),
    );

    return lotes.map((lote) => {
      const ultimoPesaje = lote.pesajes[0];
      const plan = lote.planes[0];
      return {
        id: lote.id,
        codigo: lote.codigo,
        granja: lote.galpon.granja.nombre,
        estado: lote.estado,
        fecha_ingreso: lote.fecha_ingreso,
        fecha_salida_real: lote.fecha_salida_real,
        cantidad_inicial: lote.cantidad_inicial,
        presupuesto_total_cop:
          lote.presupuesto_total_cop !== null
            ? Number(lote.presupuesto_total_cop)
            : null,
        mortalidad: muertesPorLote.get(lote.id) ?? 0,
        peso_actual_g: ultimoPesaje?.peso_promedio_g ?? null,
        // El plan vigente manda; si el lote no tiene plan, se usa el objetivo
        // que traía el último pesaje.
        peso_objetivo_g: plan
          ? Number(plan.peso_objetivo_g)
          : (ultimoPesaje?.peso_objetivo_g ?? null),
      };
    });
  }
}
