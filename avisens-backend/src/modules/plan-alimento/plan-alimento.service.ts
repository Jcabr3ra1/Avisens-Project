import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoCalculoAlimento, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';
import type { Solicitante } from '../../common/auth/acceso';
import { verificarAccesoLote } from '../../common/auth/alcance';
import { diaDeVida } from '../../common/fechas/dias-de-vida';
import { PlanLoteService } from '../plan-lote/plan-lote.service';
import {
  clasificarMortalidad,
  avesVivasEnDia,
  EntradaMortalidad,
} from './mortalidad-snapshot';
import { integrarConsumo, ALGORITMO_ACTUAL } from './consumo-curva';
import { CrearEstimacionAlimentoDto } from './dto/crear-estimacion-alimento.dto';

export const MOTIVOS_DESACTUALIZACION = [
  'plan_cambio',
  'sin_plan_vigente',
  'cantidad_inicial_cambio',
  'algoritmo_cambio',
  'mortalidad_cambio',
  'mortalidad_actual_incoherente',
] as const;

export type MotivoDesactualizacion = (typeof MOTIVOS_DESACTUALIZACION)[number];

const ESTIMACION_SELECT = {
  id: true,
  plan_lote_id: true,
  version: true,
  vigente: true,
  estado_alimento: true,
  version_algoritmo: true,
  cantidad_inicial_snapshot: true,
  dia_corte: true,
  mortalidad_snapshot: true,
  muertes_al_corte: true,
  aves_vivas_al_corte: true,
  dia_objetivo_snapshot: true,
  consumo_por_ave_g: true,
  consumo_total_kg: true,
  motivo: true,
  fecha_creacion: true,
  creado_por: { select: { id: true, nombre_completo: true } },
  plan: {
    select: {
      id: true,
      version: true,
      lote_id: true,
      fecha_salida_calculada: true,
    },
  },
  curva_version_snapshot: {
    select: {
      id: true,
      sexo: true,
      version: true,
      fuente: true,
      linea_genetica: { select: { id: true, codigo: true, nombre: true } },
    },
  },
} as const;

type EstimacionConRelaciones = Prisma.EstimacionAlimentoPlanGetPayload<{
  select: typeof ESTIMACION_SELECT;
}>;

export interface PlanVigenteInfo {
  id: number;
  version: number;
  dia_objetivo: number | null;
  desactualizado: boolean;
  es_el_mismo: boolean;
}

@Injectable()
export class PlanAlimentoService {
  constructor(
    private prisma: PrismaService,
    private planLoteService: PlanLoteService,
  ) {}

  private esConflictoUnico(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }

  private async validarLote(loteId: number, solicitante: Solicitante) {
    const lote = await this.prisma.lote.findUnique({
      where: { id: loteId },
      select: {
        id: true,
        galpon: {
          select: {
            granja: {
              select: { propietario_id: true },
            },
          },
        },
      },
    });
    if (!lote) throw new NotFoundException('Lote no encontrado');
    await verificarAccesoLote(
      this.prisma,
      loteId,
      solicitante,
      'No tienes acceso al plan de alimento de este lote',
      lote.galpon.granja.propietario_id,
    );
  }

  /**
   * Reusa PlanLoteService.obtener() -- ese es el unico lugar que sabe
   * calcular el 'desactualizado' de un PlanLote (Fase 1). Si el lote no
   * tiene plan vigente, obtener() lanza 404: aqui se atrapa para devolver
   * null, nunca se deja que tumbe toda la consulta de alimento (el indice
   * unico parcial de PlanLote garantiza como maximo un vigente, no que
   * exista uno obligatoriamente).
   */
  private async construirPlanVigente(
    loteId: number,
    solicitante: Solicitante,
    planLoteIdDeLaEstimacion: number,
  ): Promise<PlanVigenteInfo | null> {
    try {
      const planVigente = await this.planLoteService.obtener(
        loteId,
        solicitante,
      );
      return {
        id: planVigente.id,
        version: planVigente.version,
        dia_objetivo: planVigente.resultado.dia_objetivo,
        desactualizado: planVigente.desactualizado,
        es_el_mismo: planVigente.id === planLoteIdDeLaEstimacion,
      };
    } catch (error) {
      if (error instanceof NotFoundException) return null;
      throw error;
    }
  }

  /**
   * Motivos de desactualizacion de la estimacion (no del plan -- eso es
   * planVigente.desactualizado, un campo aparte). La mortalidad solo se
   * compara si el plan snapshot tuvo dia_objetivo: sin horizonte, no hay
   * ventana relevante que reconstruir.
   *
   * d_rel = max(0, min(diaActualEfectivo, dia_objetivo_snapshot - 1)):
   * una muerte registrada exactamente el dia D nunca pesa en N(d) bajo la
   * convencion fin-del-dia, asi que compararla marcaria un falso positivo.
   */
  private async calcularDesactualizado(
    estimacion: EstimacionConRelaciones,
    loteActual: { cantidad_inicial: number; fecha_ingreso: Date },
    planVigente: PlanVigenteInfo | null,
  ): Promise<{ desactualizado: boolean; motivos: MotivoDesactualizacion[] }> {
    const motivos: MotivoDesactualizacion[] = [];

    if (planVigente === null) {
      motivos.push('sin_plan_vigente');
    } else if (planVigente.id !== estimacion.plan_lote_id) {
      motivos.push('plan_cambio');
    }

    if (loteActual.cantidad_inicial !== estimacion.cantidad_inicial_snapshot) {
      motivos.push('cantidad_inicial_cambio');
    }

    if (estimacion.version_algoritmo !== ALGORITMO_ACTUAL) {
      motivos.push('algoritmo_cambio');
    }

    if (estimacion.dia_objetivo_snapshot !== null) {
      const diaActualEfectivo = Math.max(
        0,
        diaDeVida(loteActual.fecha_ingreso),
      );
      const dRel = Math.max(
        0,
        Math.min(diaActualEfectivo, estimacion.dia_objetivo_snapshot - 1),
      );

      const registrosActuales = await this.prisma.registroMortalidad.findMany({
        where: { lote_id: estimacion.plan.lote_id },
        select: { fecha: true, cantidad_aves: true },
      });
      const clasificacionActual = clasificarMortalidad(
        loteActual.fecha_ingreso,
        registrosActuales.map((r) => ({
          fecha: r.fecha,
          cantidadAves: r.cantidad_aves,
        })),
        dRel,
        loteActual.cantidad_inicial,
      );

      if (!clasificacionActual.valido) {
        motivos.push('mortalidad_actual_incoherente');
      } else {
        const snapshotOriginal =
          (estimacion.mortalidad_snapshot as EntradaMortalidad[] | null) ?? [];
        const snapshotRel = snapshotOriginal.filter((e) => e.dia <= dRel);
        if (
          JSON.stringify(snapshotRel) !==
          JSON.stringify(clasificacionActual.snapshot)
        ) {
          motivos.push('mortalidad_cambio');
        }
      }
    }

    return { desactualizado: motivos.length > 0, motivos };
  }

  /**
   * El plan decide antes que la mortalidad: sin dia_objetivo no hay
   * horizonte que fotografiar ni integrar, y las filas plan_sin_dia_objetivo
   * quedan baratas (sin snapshot de mortalidad ni lectura de curva).
   */
  private async calcularAlimento(
    tx: Prisma.TransactionClient,
    loteId: number,
    fechaIngreso: Date,
    cantidadInicial: number,
    plan: {
      estado_dia: string;
      dia_objetivo: number | null;
      curva_version_id: number | null;
    },
    diaCorte: number,
  ) {
    if (
      plan.estado_dia !== 'calculado' ||
      plan.dia_objetivo === null ||
      plan.curva_version_id === null
    ) {
      return {
        estado_alimento: 'plan_sin_dia_objetivo' as EstadoCalculoAlimento,
        mortalidad_snapshot: Prisma.DbNull,
        muertes_al_corte: null,
        aves_vivas_al_corte: null,
        dia_objetivo_snapshot: null,
        curva_version_id_snapshot: null,
        consumo_por_ave_g: null,
        consumo_total_kg: null,
      };
    }

    const registros = await tx.registroMortalidad.findMany({
      where: { lote_id: loteId },
      select: { fecha: true, cantidad_aves: true },
    });

    const clasificacion = clasificarMortalidad(
      fechaIngreso,
      registros.map((r) => ({
        fecha: r.fecha,
        cantidadAves: r.cantidad_aves,
      })),
      diaCorte,
      cantidadInicial,
    );

    if (!clasificacion.valido) {
      throw new ConflictException({
        codigo: 'mortalidad_incoherente',
        message:
          'Los registros de mortalidad del lote no permiten calcular el alimento',
        detalles: clasificacion.violaciones,
      });
    }

    const puntos = await tx.puntoCurvaGenetica.findMany({
      where: {
        curva_version_id: plan.curva_version_id,
        consumo_acumulado_g: { not: null },
      },
      orderBy: { dia: 'asc' },
      select: { dia: true, consumo_acumulado_g: true },
    });

    const resultado = integrarConsumo(
      puntos.map((p) => ({
        dia: p.dia,
        consumoAcumuladoG: p.consumo_acumulado_g as Prisma.Decimal,
      })),
      plan.dia_objetivo,
      (dia) =>
        avesVivasEnDia(clasificacion.snapshot, cantidadInicial, diaCorte, dia),
    );

    const base = {
      mortalidad_snapshot:
        clasificacion.snapshot as unknown as Prisma.InputJsonValue,
      muertes_al_corte: clasificacion.muertesAlCorte,
      aves_vivas_al_corte: clasificacion.avesVivasAlCorte,
      dia_objetivo_snapshot: plan.dia_objetivo,
      curva_version_id_snapshot: plan.curva_version_id,
    };

    if (resultado.estado !== 'calculado') {
      return {
        ...base,
        estado_alimento: resultado.estado as EstadoCalculoAlimento,
        consumo_por_ave_g: null,
        consumo_total_kg: null,
      };
    }

    return {
      ...base,
      estado_alimento: 'calculado' as EstadoCalculoAlimento,
      consumo_por_ave_g: resultado.consumoPorAveG,
      consumo_total_kg: resultado.consumoTotalKg,
    };
  }

  private mapearEstimacion(estimacion: EstimacionConRelaciones) {
    return {
      id: estimacion.id,
      version: estimacion.version,
      vigente: estimacion.vigente,
      estado_alimento: estimacion.estado_alimento,
      version_algoritmo: estimacion.version_algoritmo,
      motivo: estimacion.motivo,
      fecha_creacion: estimacion.fecha_creacion,
      creado_por: estimacion.creado_por,
      plan: {
        id: estimacion.plan.id,
        version: estimacion.plan.version,
        dia_objetivo: estimacion.dia_objetivo_snapshot,
        fecha_salida_calculada: estimacion.plan.fecha_salida_calculada,
        curva: estimacion.curva_version_snapshot
          ? {
              version_id: estimacion.curva_version_snapshot.id,
              linea_genetica: estimacion.curva_version_snapshot.linea_genetica,
              sexo: estimacion.curva_version_snapshot.sexo,
              version: estimacion.curva_version_snapshot.version,
              fuente: estimacion.curva_version_snapshot.fuente,
            }
          : null,
      },
      corte: {
        dia: estimacion.dia_corte,
        cantidad_inicial: estimacion.cantidad_inicial_snapshot,
        muertes: estimacion.muertes_al_corte,
        aves_vivas: estimacion.aves_vivas_al_corte,
        mortalidad_por_dia:
          (estimacion.mortalidad_snapshot as EntradaMortalidad[] | null) ?? [],
      },
      resultado: {
        consumo_por_ave_g: estimacion.consumo_por_ave_g,
        consumo_total_kg: estimacion.consumo_total_kg,
      },
    };
  }

  async crear(
    loteId: number,
    dto: CrearEstimacionAlimentoDto,
    solicitante: Solicitante,
  ) {
    await this.validarLote(loteId, solicitante);

    const estimacion = await this.prisma.$transaction(async (tx) => {
      // Orden de bloqueo OBLIGATORIO: lotes primero, planes_lote despues --
      // el mismo que plan-lote.service.ts. Invertirlo puede deadlockear dos
      // transacciones concurrentes que tomen los locks en orden distinto.
      const [lote] = await tx.$queryRaw<
        Array<{
          estado: string;
          fecha_ingreso: Date;
          cantidad_inicial: number;
          fecha_salida_real: Date | null;
        }>
      >`
        SELECT "estado", "fecha_ingreso", "cantidad_inicial", "fecha_salida_real"
        FROM "lotes"
        WHERE "id" = ${loteId}
        FOR UPDATE
      `;
      if (!lote) throw new NotFoundException('Lote no encontrado');
      if (
        lote.estado === 'inactivo' ||
        lote.estado === 'finalizado' ||
        lote.fecha_salida_real !== null
      ) {
        throw new ConflictException(
          'Un lote inactivo, finalizado o con fecha de salida real no admite nuevas estimaciones de alimento',
        );
      }

      const [plan] = await tx.$queryRaw<
        Array<{
          id: number;
          estado_dia: string;
          dia_objetivo: number | null;
          curva_version_id: number | null;
        }>
      >`
        SELECT "id", "estado_dia", "dia_objetivo", "curva_version_id"
        FROM "planes_lote"
        WHERE "lote_id" = ${loteId} AND "vigente"
        FOR UPDATE
      `;
      if (!plan) {
        throw new NotFoundException(
          'Este lote no tiene un plan vigente al que estimarle alimento',
        );
      }

      // Lote con ingreso futuro (planificacion): diaDeVida da 0 o negativo,
      // el max lo deja en 0. Ver diseño Fase 2A, "dia_corte = 0".
      const diaCorte = Math.max(0, diaDeVida(lote.fecha_ingreso));

      // Se calcula ANTES de jubilar/versionar: un 409 aqui no debe dejar
      // rastro (ni version quemada, ni fila jubilada de mas).
      const datosCalculo = await this.calcularAlimento(
        tx,
        loteId,
        lote.fecha_ingreso,
        lote.cantidad_inicial,
        plan,
        diaCorte,
      );

      await tx.estimacionAlimentoPlan.updateMany({
        where: { plan_lote_id: plan.id, vigente: true },
        data: { vigente: false },
      });

      // version = maximo historico + 1, nunca 1 fijo (el bug de Umbrales).
      const ultima = await tx.estimacionAlimentoPlan.findFirst({
        where: { plan_lote_id: plan.id },
        orderBy: { version: 'desc' },
        select: { version: true },
      });
      const version = ultima ? ultima.version + 1 : 1;

      try {
        return await tx.estimacionAlimentoPlan.create({
          data: {
            plan_lote_id: plan.id,
            version,
            version_algoritmo: ALGORITMO_ACTUAL,
            dia_corte: diaCorte,
            cantidad_inicial_snapshot: lote.cantidad_inicial,
            motivo: dto.motivo,
            creado_por_id: solicitante.id,
            ...datosCalculo,
          },
          select: ESTIMACION_SELECT,
        });
      } catch (error: unknown) {
        if (this.esConflictoUnico(error)) {
          throw new ConflictException(
            'Ya existe una estimación vigente para este plan; vuelve a intentarlo',
          );
        }
        throw error;
      }
    });

    const planVigente = await this.construirPlanVigente(
      loteId,
      solicitante,
      estimacion.plan_lote_id,
    );

    return {
      ...this.mapearEstimacion(estimacion),
      efectiva: true,
      plan_vigente: planVigente,
      desactualizado: false,
      motivos_desactualizacion: [] as MotivoDesactualizacion[],
      antiguedad_dias: 0,
    };
  }

  async obtener(loteId: number, solicitante: Solicitante) {
    await this.validarLote(loteId, solicitante);

    // La MAS RECIENTE del lote, no solo del plan vigente: puede pertenecer
    // a un PlanLote ya jubilado. GET nunca da 404 solo porque el plan
    // vigente todavia no tiene estimacion propia.
    const estimacion = await this.prisma.estimacionAlimentoPlan.findFirst({
      where: { plan: { lote_id: loteId } },
      orderBy: [{ plan: { version: 'desc' } }, { version: 'desc' }],
      select: ESTIMACION_SELECT,
    });
    if (!estimacion) {
      throw new NotFoundException(
        'Este lote no tiene ninguna estimación de alimento',
      );
    }

    const loteActual = await this.prisma.lote.findUniqueOrThrow({
      where: { id: loteId },
      select: { cantidad_inicial: true, fecha_ingreso: true },
    });

    const planVigente = await this.construirPlanVigente(
      loteId,
      solicitante,
      estimacion.plan_lote_id,
    );

    const { desactualizado, motivos } = await this.calcularDesactualizado(
      estimacion,
      loteActual,
      planVigente,
    );

    const antiguedadDias =
      Math.max(0, diaDeVida(loteActual.fecha_ingreso)) - estimacion.dia_corte;

    return {
      ...this.mapearEstimacion(estimacion),
      efectiva: true,
      plan_vigente: planVigente,
      desactualizado,
      motivos_desactualizacion: motivos,
      antiguedad_dias: antiguedadDias,
    };
  }

  async historial(
    loteId: number,
    { page, limit }: PaginationQueryDto,
    solicitante: Solicitante,
  ) {
    await this.validarLote(loteId, solicitante);

    const where = { plan: { lote_id: loteId } };

    // Una sola consulta extra para saber cual id es la globalmente mas
    // reciente -- NUNCA una consulta por fila. En una pagina puede haber
    // cero o una 'efectiva: true'; en todo el historial, siempre una sola.
    const [data, total, masReciente] = await this.prisma.$transaction([
      this.prisma.estimacionAlimentoPlan.findMany({
        where,
        select: ESTIMACION_SELECT,
        orderBy: [{ plan: { version: 'desc' } }, { version: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.estimacionAlimentoPlan.count({ where }),
      this.prisma.estimacionAlimentoPlan.findFirst({
        where,
        orderBy: [{ plan: { version: 'desc' } }, { version: 'desc' }],
        select: { id: true },
      }),
    ]);

    return paginate(
      data.map((estimacion) => ({
        ...this.mapearEstimacion(estimacion),
        efectiva: masReciente?.id === estimacion.id,
      })),
      total,
      page,
      limit,
    );
  }
}
