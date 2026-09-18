import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoCalculoPlan, Prisma, SexoCurva } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';
import type { Solicitante } from '../../common/auth/acceso';
import { verificarAccesoLote } from '../../common/auth/alcance';
import { fechaDeVida } from '../../common/fechas/dias-de-vida';
import { resolverDiaObjetivo } from './interpolacion';
import { CrearPlanLoteDto } from './dto/crear-plan-lote.dto';
import { RecalcularPlanLoteDto } from './dto/recalcular-plan-lote.dto';

const PLAN_SELECT = {
  id: true,
  lote_id: true,
  version: true,
  vigente: true,
  peso_objetivo_g: true,
  estado_dia: true,
  curva_version_id: true,
  linea_genetica_id_snapshot: true,
  sexo_curva_snapshot: true,
  fecha_ingreso_snapshot: true,
  dia_objetivo: true,
  dia_objetivo_interpolado: true,
  fecha_salida_calculada: true,
  motivo: true,
  creado_por_id: true,
  fecha_creacion: true,
} as const;

interface ResultadoEstadoPlan {
  estado_dia: EstadoCalculoPlan;
  curva_version_id: number | null;
  dia_objetivo: number | null;
  dia_objetivo_interpolado: Prisma.Decimal | null;
  fecha_salida_calculada: Date | null;
}

interface SnapshotPlan {
  lote_id: number;
  linea_genetica_id_snapshot: number | null;
  sexo_curva_snapshot: SexoCurva;
  fecha_ingreso_snapshot: Date;
  curva_version_id: number | null;
  estado_dia: EstadoCalculoPlan;
}

@Injectable()
export class PlanLoteService {
  constructor(private prisma: PrismaService) {}

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
      'No tienes acceso al plan de este lote',
      lote.galpon.granja.propietario_id,
    );
  }

  /**
   * Motor de decision de estado_dia. Recibe un cliente (this.prisma o un tx)
   * porque lo usan tanto crear()/recalcular() -- dentro de la transaccion que
   * bloquea el lote -- como esDesactualizado() -- en una lectura suelta, para
   * saber si la curva vigente actual sigue siendo la misma que uso este plan.
   *
   * Sin linea genetica o sin curva vigente para (linea, sexo) -> sin_curva.
   * Con curva, el resultado de resolverDiaObjetivo decide el resto: solo en
   * 'calculado' se deriva fecha_salida_calculada con fechaDeVida.
   */
  private async calcularEstadoDia(
    cliente: Prisma.TransactionClient,
    lineaGeneticaId: number | null,
    sexoResuelto: SexoCurva,
    pesoObjetivoG: Prisma.Decimal,
    fechaIngreso: Date,
  ): Promise<ResultadoEstadoPlan> {
    if (lineaGeneticaId === null) {
      return {
        estado_dia: 'sin_curva',
        curva_version_id: null,
        dia_objetivo: null,
        dia_objetivo_interpolado: null,
        fecha_salida_calculada: null,
      };
    }

    const curva = await cliente.curvaGeneticaVersion.findFirst({
      where: {
        linea_genetica_id: lineaGeneticaId,
        sexo: sexoResuelto,
        vigente: true,
      },
      select: { id: true },
    });
    if (!curva) {
      return {
        estado_dia: 'sin_curva',
        curva_version_id: null,
        dia_objetivo: null,
        dia_objetivo_interpolado: null,
        fecha_salida_calculada: null,
      };
    }

    const puntos = await cliente.puntoCurvaGenetica.findMany({
      where: { curva_version_id: curva.id },
      orderBy: { dia: 'asc' },
      select: { dia: true, peso_esperado_g: true },
    });

    const resultado = resolverDiaObjetivo(
      puntos.map((p) => ({ dia: p.dia, pesoEsperadoG: p.peso_esperado_g })),
      pesoObjetivoG,
    );

    if (resultado.estado !== 'calculado') {
      return {
        estado_dia: resultado.estado,
        curva_version_id: curva.id,
        dia_objetivo: null,
        dia_objetivo_interpolado: null,
        fecha_salida_calculada: null,
      };
    }

    return {
      estado_dia: 'calculado',
      curva_version_id: curva.id,
      dia_objetivo: resultado.diaObjetivo,
      dia_objetivo_interpolado: resultado.diaObjetivoInterpolado,
      fecha_salida_calculada: fechaDeVida(fechaIngreso, resultado.diaObjetivo),
    };
  }

  /**
   * desactualizado se deriva siempre en la lectura, nunca se persiste: compara
   * el snapshot de este plan contra el estado ACTUAL del lote y su curva
   * vigente compatible. Cualquier diferencia en linea, sexo resuelto o fecha
   * de ingreso ya lo marca; si esos tres coinciden, todavia puede haber
   * cambiado la curva vigente para esa combinacion (o haber aparecido una
   * donde antes no habia ninguna).
   */
  private async esDesactualizado(plan: SnapshotPlan): Promise<boolean> {
    const lote = await this.prisma.lote.findUniqueOrThrow({
      where: { id: plan.lote_id },
      select: { linea_genetica_id: true, sexo: true, fecha_ingreso: true },
    });
    const sexoActual = (lote.sexo ?? 'mixto') as SexoCurva;

    if (lote.linea_genetica_id !== plan.linea_genetica_id_snapshot) {
      return true;
    }
    if (sexoActual !== plan.sexo_curva_snapshot) {
      return true;
    }
    if (
      lote.fecha_ingreso.getTime() !== plan.fecha_ingreso_snapshot.getTime()
    ) {
      return true;
    }
    if (lote.linea_genetica_id === null) {
      return false;
    }

    const curvaVigente = await this.prisma.curvaGeneticaVersion.findFirst({
      where: {
        linea_genetica_id: lote.linea_genetica_id,
        sexo: sexoActual,
        vigente: true,
      },
      select: { id: true },
    });

    if (plan.estado_dia === 'sin_curva') {
      return curvaVigente !== null;
    }
    return curvaVigente?.id !== plan.curva_version_id;
  }

  async crear(loteId: number, dto: CrearPlanLoteDto, solicitante: Solicitante) {
    await this.validarLote(loteId, solicitante);
    const pesoObjetivoG = new Prisma.Decimal(dto.peso_objetivo_g);

    return this.prisma.$transaction(async (tx) => {
      const [fila] = await tx.$queryRaw<
        Array<{
          linea_genetica_id: number | null;
          sexo: string | null;
          fecha_ingreso: Date;
        }>
      >`
        SELECT "linea_genetica_id", "sexo", "fecha_ingreso" FROM "lotes"
        WHERE "id" = ${loteId}
        FOR UPDATE
      `;
      if (!fila) throw new NotFoundException('Lote no encontrado');

      const sexoResuelto = (fila.sexo ?? 'mixto') as SexoCurva;
      const estado = await this.calcularEstadoDia(
        tx,
        fila.linea_genetica_id,
        sexoResuelto,
        pesoObjetivoG,
        fila.fecha_ingreso,
      );

      await tx.planLote.updateMany({
        where: { lote_id: loteId, vigente: true },
        data: { vigente: false },
      });

      // version = maximo historico + 1, nunca 1 fijo: el mismo bug que
      // crear->jubilar->crear dejo en Umbrales cuando se asumia version 1.
      const ultima = await tx.planLote.findFirst({
        where: { lote_id: loteId },
        orderBy: { version: 'desc' },
        select: { version: true },
      });
      const version = ultima ? ultima.version + 1 : 1;

      try {
        const plan = await tx.planLote.create({
          data: {
            lote_id: loteId,
            version,
            peso_objetivo_g: pesoObjetivoG,
            estado_dia: estado.estado_dia,
            curva_version_id: estado.curva_version_id,
            linea_genetica_id_snapshot: fila.linea_genetica_id,
            sexo_curva_snapshot: sexoResuelto,
            fecha_ingreso_snapshot: fila.fecha_ingreso,
            dia_objetivo: estado.dia_objetivo,
            dia_objetivo_interpolado: estado.dia_objetivo_interpolado,
            fecha_salida_calculada: estado.fecha_salida_calculada,
            motivo: dto.motivo,
            creado_por_id: solicitante.id,
          },
          select: PLAN_SELECT,
        });
        return { ...plan, desactualizado: false };
      } catch (error: unknown) {
        if (this.esConflictoUnico(error)) {
          throw new ConflictException(
            'Ya existe un plan vigente para este lote; vuelve a intentarlo',
          );
        }
        throw error;
      }
    });
  }

  async recalcular(
    loteId: number,
    dto: RecalcularPlanLoteDto,
    solicitante: Solicitante,
  ) {
    await this.validarLote(loteId, solicitante);

    return this.prisma.$transaction(async (tx) => {
      const [fila] = await tx.$queryRaw<
        Array<{
          linea_genetica_id: number | null;
          sexo: string | null;
          fecha_ingreso: Date;
        }>
      >`
        SELECT "linea_genetica_id", "sexo", "fecha_ingreso" FROM "lotes"
        WHERE "id" = ${loteId}
        FOR UPDATE
      `;
      if (!fila) throw new NotFoundException('Lote no encontrado');

      const vigente = await tx.planLote.findFirst({
        where: { lote_id: loteId, vigente: true },
        select: { peso_objetivo_g: true },
      });
      if (!vigente) {
        throw new NotFoundException(
          'Este lote no tiene un plan vigente que recalcular',
        );
      }

      const sexoResuelto = (fila.sexo ?? 'mixto') as SexoCurva;
      const estado = await this.calcularEstadoDia(
        tx,
        fila.linea_genetica_id,
        sexoResuelto,
        vigente.peso_objetivo_g,
        fila.fecha_ingreso,
      );

      await tx.planLote.updateMany({
        where: { lote_id: loteId, vigente: true },
        data: { vigente: false },
      });

      const ultima = await tx.planLote.findFirst({
        where: { lote_id: loteId },
        orderBy: { version: 'desc' },
        select: { version: true },
      });
      const version = ultima ? ultima.version + 1 : 1;

      try {
        const plan = await tx.planLote.create({
          data: {
            lote_id: loteId,
            version,
            peso_objetivo_g: vigente.peso_objetivo_g,
            estado_dia: estado.estado_dia,
            curva_version_id: estado.curva_version_id,
            linea_genetica_id_snapshot: fila.linea_genetica_id,
            sexo_curva_snapshot: sexoResuelto,
            fecha_ingreso_snapshot: fila.fecha_ingreso,
            dia_objetivo: estado.dia_objetivo,
            dia_objetivo_interpolado: estado.dia_objetivo_interpolado,
            fecha_salida_calculada: estado.fecha_salida_calculada,
            motivo: dto.motivo,
            creado_por_id: solicitante.id,
          },
          select: PLAN_SELECT,
        });
        return { ...plan, desactualizado: false };
      } catch (error: unknown) {
        if (this.esConflictoUnico(error)) {
          throw new ConflictException(
            'Ya existe un plan vigente para este lote; vuelve a intentarlo',
          );
        }
        throw error;
      }
    });
  }

  async obtener(loteId: number, solicitante: Solicitante) {
    await this.validarLote(loteId, solicitante);

    const plan = await this.prisma.planLote.findFirst({
      where: { lote_id: loteId, vigente: true },
      select: PLAN_SELECT,
    });
    if (!plan) {
      throw new NotFoundException('Este lote no tiene un plan vigente');
    }

    return { ...plan, desactualizado: await this.esDesactualizado(plan) };
  }

  async historial(
    loteId: number,
    { page, limit }: PaginationQueryDto,
    solicitante: Solicitante,
  ) {
    await this.validarLote(loteId, solicitante);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.planLote.findMany({
        where: { lote_id: loteId },
        select: PLAN_SELECT,
        orderBy: { version: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.planLote.count({ where: { lote_id: loteId } }),
    ]);

    const conDesactualizado = await Promise.all(
      data.map(async (plan) => ({
        ...plan,
        desactualizado: await this.esDesactualizado(plan),
      })),
    );

    return paginate(conDesactualizado, total, page, limit);
  }
}
