import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLoteDto } from './dto/create-lote.dto';
import { UpdateLoteDto } from './dto/update-lote.dto';
import { CerrarLoteDto } from './dto/cerrar-lote.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';
import { verificarDueno } from '../../common/auth/acceso';
import { Solicitante } from '../../common/auth/acceso';
import { filtroLotes, verificarAccesoLote } from '../../common/auth/alcance';
import {
  diaDeVidaDeFecha,
  fechaDeVida,
} from '../../common/fechas/dias-de-vida';
import { randomUUID } from 'node:crypto';

export interface DiaFaltanteCierre {
  dia: number;
  fecha: string;
}

export type ResultadoCierreLote =
  | {
      cerrado: false;
      requiere_confirmacion: true;
      mensaje: string;
      dias_sin_alimento: DiaFaltanteCierre[];
      dias_sin_mortalidad: DiaFaltanteCierre[];
    }
  | {
      cerrado: true;
      requiere_confirmacion: false;
      lote: unknown;
      movimiento_financiero: unknown;
      resumen_cierre: {
        duracion_dias: number;
        muertes_totales: number;
        mortalidad_acumulada_final_pct: number;
        alimento_total_kg: number;
        peso_total_vendido_kg: number;
        fcr_final: number | null;
        precio_venta_kg_cop: number | null;
      };
    };

const CATEGORIA_VENTA_AVES = 'Venta de aves';

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
  cantidad_aves_vendidas: true,
  peso_promedio_final_g: true,
  valor_venta_total_cop: true,
  precio_venta_kg_cop: true,
  mortalidad_acumulada_final_pct: true,
  fcr_final: true,
  cerrado_por_id: true,
  fecha_cierre: true,
  estado: true,
  galpon: {
    select: {
      id: true,
      nombre: true,
      granja: { select: { id: true, nombre: true, propietario_id: true } },
    },
  },
  linea_genetica: { select: { id: true, codigo: true, nombre: true } },
  cerrado_por: { select: { id: true, nombre_completo: true } },
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

  /**
   * Bloquea la fila de la linea y decide "activa" con ESTA lectura, dentro
   * de la misma transaccion que crea/actualiza el lote -- no con una
   * consulta previa fuera de la transaccion. Sin este orden, una
   * desactivacion concurrente (LineasGeneticasService.cambiarEstado(), un
   * UPDATE simple) podria confirmar entre el chequeo y el create()/update()
   * del lote, dejando pasar una asignacion sobre una linea ya inactiva. Si
   * la desactivacion ya tomo este mismo lock de fila, esta consulta espera
   * a que termine antes de decidir (mismo patron que CurvasGeneticasService
   * en Fase 0).
   */
  private async bloquearYValidarLineaGenetica(
    tx: Prisma.TransactionClient,
    lineaGeneticaId: number,
  ) {
    const [linea] = await tx.$queryRaw<Array<{ id: number; activo: boolean }>>`
      SELECT "id", "activo" FROM "lineas_geneticas"
      WHERE "id" = ${lineaGeneticaId}
      FOR UPDATE
    `;
    if (!linea) throw new NotFoundException('Línea genética no encontrada');
    if (!linea.activo) {
      throw new BadRequestException(
        'No se puede asignar una línea genética inactiva',
      );
    }
  }

  async crear(dto: CreateLoteDto, solicitante: Solicitante) {
    await this.validarGalpon(dto.galpon_id, solicitante);

    return this.prisma.$transaction(async (transaccion) => {
      if (
        dto.linea_genetica_id !== undefined &&
        dto.linea_genetica_id !== null
      ) {
        await this.bloquearYValidarLineaGenetica(
          transaccion,
          dto.linea_genetica_id,
        );
      }

      const creado = await transaccion.lote.create({
        data: {
          galpon_id: dto.galpon_id,
          codigo: `TEMP-${randomUUID()}`,
          fecha_ingreso: new Date(dto.fecha_ingreso),
          cantidad_inicial: dto.cantidad_inicial,
          raza: dto.raza,
          sexo: dto.sexo,
          linea_genetica_id: dto.linea_genetica_id ?? null,
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

    return this.prisma.$transaction(async (transaccion) => {
      if (
        dto.linea_genetica_id !== undefined &&
        dto.linea_genetica_id !== null
      ) {
        await this.bloquearYValidarLineaGenetica(
          transaccion,
          dto.linea_genetica_id,
        );
      }

      return transaccion.lote.update({
        where: { id },
        data: {
          galpon_id: undefined,
          fecha_ingreso: dto.fecha_ingreso
            ? new Date(dto.fecha_ingreso)
            : undefined,
          cantidad_inicial: dto.cantidad_inicial,
          raza: dto.raza,
          sexo: dto.sexo,
          linea_genetica_id: dto.linea_genetica_id,
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

  async cerrar(
    id: number,
    dto: CerrarLoteDto,
    solicitante: Solicitante,
  ): Promise<ResultadoCierreLote> {
    const lote = await this.prisma.lote.findUnique({
      where: { id },
      select: {
        id: true,
        codigo: true,
        estado: true,
        fecha_ingreso: true,
        cantidad_inicial: true,
        galpon: {
          select: {
            id: true,
            nombre: true,
            granja: { select: { id: true, nombre: true, propietario_id: true } },
          },
        },
      },
    });
    if (!lote) throw new NotFoundException('Lote no encontrado');

    verificarDueno(
      solicitante,
      lote.galpon.granja.propietario_id,
      'Solo puedes cerrar lotes de tus propias granjas',
    );

    if (lote.estado !== 'activo') {
      throw new ConflictException(
        'Solo se pueden cerrar lotes en estado activo',
      );
    }

    const fechaSalidaReal = new Date(
      `${dto.fecha_salida_real.slice(0, 10)}T00:00:00.000Z`,
    );
    const duracionDias = diaDeVidaDeFecha(lote.fecha_ingreso, fechaSalidaReal);
    if (duracionDias < 1) {
      throw new BadRequestException(
        'La fecha de salida real no puede ser anterior a la fecha de ingreso del lote',
      );
    }

    if (dto.cantidad_aves_vendidas > lote.cantidad_inicial) {
      throw new BadRequestException(
        'La cantidad de aves vendidas no puede superar la cantidad inicial del lote',
      );
    }

    const [consumos, mortalidades] = await Promise.all([
      this.prisma.consumoDiario.findMany({
        where: {
          lote_id: id,
          fecha: { gte: lote.fecha_ingreso, lte: fechaSalidaReal },
        },
        select: { fecha: true, alimento_kg: true },
      }),
      this.prisma.registroMortalidad.findMany({
        where: {
          lote_id: id,
          fecha: { gte: lote.fecha_ingreso, lte: fechaSalidaReal },
        },
        select: { fecha: true, cantidad_aves: true },
      }),
    ]);

    const diasConAlimento = new Set<number>();
    let alimentoTotalKg = 0;
    for (const consumo of consumos) {
      if (consumo.alimento_kg !== null && consumo.alimento_kg > 0) {
        const dia = diaDeVidaDeFecha(lote.fecha_ingreso, consumo.fecha);
        if (dia >= 1 && dia <= duracionDias) {
          diasConAlimento.add(dia);
        }
        alimentoTotalKg += consumo.alimento_kg;
      }
    }

    const diasConMortalidad = new Set<number>();
    let muertesTotales = 0;
    for (const mortalidad of mortalidades) {
      const dia = diaDeVidaDeFecha(lote.fecha_ingreso, mortalidad.fecha);
      if (dia >= 1 && dia <= duracionDias) {
        diasConMortalidad.add(dia);
      }
      muertesTotales += mortalidad.cantidad_aves;
    }

    const diasSinAlimento: DiaFaltanteCierre[] = [];
    const diasSinMortalidad: DiaFaltanteCierre[] = [];
    for (let dia = 1; dia <= duracionDias; dia++) {
      const fecha = fechaDeVida(lote.fecha_ingreso, dia)
        .toISOString()
        .slice(0, 10);
      if (!diasConAlimento.has(dia)) {
        diasSinAlimento.push({ dia, fecha });
      }
      if (!diasConMortalidad.has(dia)) {
        diasSinMortalidad.push({ dia, fecha });
      }
    }

    if (diasSinAlimento.length > 0 && !dto.confirmar_cierre) {
      return {
        cerrado: false,
        requiere_confirmacion: true,
        mensaje:
          'Existen días del ciclo sin registro de consumo de alimento. Confirma el cierre enviando confirmar_cierre: true si deseas continuar de todos modos.',
        dias_sin_alimento: diasSinAlimento,
        dias_sin_mortalidad: diasSinMortalidad,
      };
    }

    const mortalidadAcumuladaFinalPct = Number(
      ((muertesTotales / lote.cantidad_inicial) * 100).toFixed(2),
    );
    const pesoTotalVendidoKg = Number(
      ((dto.peso_promedio_final_g / 1000) * dto.cantidad_aves_vendidas).toFixed(
        2,
      ),
    );
    const fcrFinal =
      pesoTotalVendidoKg > 0
        ? Number((alimentoTotalKg / pesoTotalVendidoKg).toFixed(3))
        : null;

    const valorVentaTotalCop = dto.valor_venta_total_cop ?? null;
    const precioVentaKgCop =
      dto.precio_venta_kg_cop !== undefined
        ? dto.precio_venta_kg_cop
        : valorVentaTotalCop !== null &&
            valorVentaTotalCop > 0 &&
            pesoTotalVendidoKg > 0
          ? Number((valorVentaTotalCop / pesoTotalVendidoKg).toFixed(2))
          : null;

    const { loteActualizado, movimientoFinanciero } =
      await this.prisma.$transaction(async (tx) => {
        const [fila] = await tx.$queryRaw<
          Array<{ id: number; estado: string }>
        >`
          SELECT "id", "estado" FROM "lotes"
          WHERE "id" = ${id}
          FOR UPDATE
        `;
        if (!fila) throw new NotFoundException('Lote no encontrado');
        if (fila.estado !== 'activo') {
          throw new ConflictException(
            'Solo se pueden cerrar lotes en estado activo',
          );
        }

        const actualizado = await tx.lote.update({
          where: { id },
          data: {
            estado: 'finalizado',
            fecha_salida_real: fechaSalidaReal,
            cantidad_aves_vendidas: dto.cantidad_aves_vendidas,
            peso_promedio_final_g: dto.peso_promedio_final_g,
            valor_venta_total_cop: valorVentaTotalCop,
            precio_venta_kg_cop: precioVentaKgCop,
            mortalidad_acumulada_final_pct: mortalidadAcumuladaFinalPct,
            fcr_final: fcrFinal,
            cerrado_por_id: solicitante.id,
            fecha_cierre: new Date(),
          },
          select: LOTE_SELECT,
        });

        let movimiento: unknown = null;
        if (valorVentaTotalCop !== null && valorVentaTotalCop > 0) {
          let categoria = await tx.categoriaFinanciera.findFirst({
            where: {
              nombre: { equals: CATEGORIA_VENTA_AVES, mode: 'insensitive' },
            },
            select: { id: true },
          });
          if (!categoria) {
            categoria = await tx.categoriaFinanciera.create({
              data: { nombre: CATEGORIA_VENTA_AVES, tipo: 'ingreso' },
              select: { id: true },
            });
          }

          movimiento = await tx.movimientoFinanciero.create({
            data: {
              granja_id: lote.galpon.granja.id,
              lote_id: lote.id,
              categoria_id: categoria.id,
              tipo: 'ingreso',
              valor_cop: valorVentaTotalCop,
              fecha: fechaSalidaReal,
              descripcion: `Liquidación final lote ${lote.codigo} (${dto.cantidad_aves_vendidas} aves, ${dto.peso_promedio_final_g} g prom.)`,
              usuario_id: solicitante.id,
            },
            select: {
              id: true,
              granja_id: true,
              lote_id: true,
              categoria_id: true,
              tipo: true,
              valor_cop: true,
              fecha: true,
              descripcion: true,
              usuario_id: true,
            },
          });
        }

        return {
          loteActualizado: actualizado,
          movimientoFinanciero: movimiento,
        };
      });

    return {
      cerrado: true,
      requiere_confirmacion: false,
      lote: loteActualizado,
      movimiento_financiero: movimientoFinanciero,
      resumen_cierre: {
        duracion_dias: duracionDias,
        muertes_totales: muertesTotales,
        mortalidad_acumulada_final_pct: mortalidadAcumuladaFinalPct,
        alimento_total_kg: Number(alimentoTotalKg.toFixed(2)),
        peso_total_vendido_kg: pesoTotalVendidoKg,
        fcr_final: fcrFinal,
        precio_venta_kg_cop: precioVentaKgCop,
      },
    };
  }
}
