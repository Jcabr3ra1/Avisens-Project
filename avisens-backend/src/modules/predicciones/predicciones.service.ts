import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { Solicitante } from '../../common/auth/acceso';
import { verificarAccesoLote } from '../../common/auth/alcance';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';
import { ConfigService } from '@nestjs/config';
import { PlanLoteService } from '../plan-lote/plan-lote.service';
import { diaDeVidaDeFecha, fechaDeVida } from '../../common/fechas/dias-de-vida';

const UMBRAL_DESVIO_PCT = 5;
const UMBRAL_DESVIO_FCR = 0.05;
const LIMITE_DIA_FAENA_ML = { min: 1, max: 100 } as const;
const LIMITE_PESO_OBJETIVO_ML = { min: 0, max: 10000 } as const;

const PREDICCION_SELECT = {
  id: true,
  lote_id: true,
  tipo: true,
  valor_predicho: true,
  unidad: true,
  horizonte_dias: true,
  confianza: true,
  fecha_objetivo: true,
  datos_entrada: true,
  fecha_generacion: true,
  modelo: {
    select: {
      id: true,
      nombre: true,
      version: true,
      framework: true,
      objetivo: true,
    },
  },
} as const;

export interface MetadataModelo {
  nombre: string;
  version: string;
  framework: string;
  tipo: string;
  objetivo: string;
  confianza: number;
  puntos_usados: number;
}

interface RespuestaPesoMl {
  peso_proyectado_faena_g: number;
  dia_faena: number;
  dias_al_objetivo: number | null;
  peso_objetivo_g: number;
  modelo?: MetadataModelo;
}

interface RespuestaMortalidadMl {
  mortalidad_proyectada_pct: number;
  dia_faena: number;
  modelo?: MetadataModelo;
}

interface RespuestaConsumoMl {
  consumo_proyectado_kg: number;
  dia_faena: number;
  modelo?: MetadataModelo;
}

type MagnitudProyectada<T> =
  | { estado: 'calculado'; datos: T; descartadasPorIngreso: number }
  | { estado: 'sin_datos'; descartadasPorIngreso: number }
  | {
      estado: 'horizonte_vencido';
      ultimoDiaObservado: number;
      descartadasPorIngreso: number;
    };

export interface OmisionMagnitud {
  magnitud: 'mortalidad' | 'consumo';
  motivo: 'horizonte_vencido';
  ultimo_dia_observado: number;
}

export interface ObservacionesDescartadas {
  pesajes: number;
  mortalidades: number;
  consumos: number;
  motivo: 'antes_del_ingreso';
}

interface ResultadoPrediccion {
  peso_proyectado_faena_g: number;
  dia_faena: number;
  peso_objetivo_g: number;
  plan_lote_id: number;
  plan_version: number;
  mortalidad_proyectada_pct: number | null;
  consumo_proyectado_kg: number | null;
  fcr_proyectado: number | null;
  comparacion_objetivo: null;
  comparacion_objetivo_motivo: string;
  llegada_proyectada: { dia_vida: number; fecha: Date } | null;
  omisiones: OmisionMagnitud[];
  observaciones_descartadas: ObservacionesDescartadas;
  modelos?: {
    peso?: MetadataModelo;
    mortalidad?: MetadataModelo;
    consumo?: MetadataModelo;
  };
}

@Injectable()
export class PrediccionesService {
  private readonly logger = new Logger(PrediccionesService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private planLoteService: PlanLoteService,
  ) {}

  async predecir(loteId: number, solicitante: Solicitante, persistir = false) {
    const lote = await this.prisma.lote.findUnique({
      where: { id: loteId },
      select: {
        fecha_ingreso: true,
        cantidad_inicial: true,
        sexo: true,
        marca_alimento: true,
        galpon: { select: { granja: { select: { propietario_id: true } } } },
      },
    });
    if (!lote) throw new NotFoundException('Lote no encontrado');

    await verificarAccesoLote(
      this.prisma,
      loteId,
      solicitante,
      'Solo puedes predecir tus propios lotes',
      lote.galpon.granja.propietario_id,
    );

    let plan: Awaited<ReturnType<PlanLoteService['obtener']>>;
    try {
      plan = await this.planLoteService.obtener(loteId, solicitante);
    } catch (e) {
      if (
        e instanceof NotFoundException &&
        e.message === 'Este lote no tiene un plan vigente'
      ) {
        throw new UnprocessableEntityException({
          codigo: 'sin_plan_utilizable',
          message: 'El lote no tiene un plan con día objetivo calculado',
          estado_plan: 'sin_plan',
        });
      }
      throw e;
    }

    if (plan.desactualizado) {
      throw new UnprocessableEntityException({
        codigo: 'plan_desactualizado',
        message:
          'El plan del lote está desactualizado; recalcúlalo antes de predecir',
      });
    }

    if (plan.estado_dia !== 'calculado' || plan.resultado.dia_objetivo === null) {
      throw new UnprocessableEntityException({
        codigo: 'sin_plan_utilizable',
        message: 'El lote no tiene un plan con día objetivo calculado',
        estado_plan:
          plan.estado_dia === 'calculado'
            ? 'datos_insuficientes'
            : plan.estado_dia,
      });
    }

    const diaFaenaPlan = plan.resultado.dia_objetivo;
    const pesoObjetivoPlan = Number(plan.peso_objetivo_g);

    if (
      diaFaenaPlan < LIMITE_DIA_FAENA_ML.min ||
      diaFaenaPlan > LIMITE_DIA_FAENA_ML.max ||
      pesoObjetivoPlan <= LIMITE_PESO_OBJETIVO_ML.min ||
      pesoObjetivoPlan > LIMITE_PESO_OBJETIVO_ML.max
    ) {
      throw new UnprocessableEntityException({
        codigo: 'plan_excede_limites_ml',
        message: `El plan del lote pide un día de faena o un peso objetivo fuera de lo que el modelo acepta (día entre ${LIMITE_DIA_FAENA_ML.min} y ${LIMITE_DIA_FAENA_ML.max}, peso hasta ${LIMITE_PESO_OBJETIVO_ML.max} g): día ${diaFaenaPlan}, peso ${pesoObjetivoPlan} g`,
        dia_faena: diaFaenaPlan,
        peso_objetivo_g: pesoObjetivoPlan,
      });
    }

    const pesajes = await this.prisma.pesaje.findMany({
      where: { lote_id: loteId },
      orderBy: { fecha: 'asc' },
      select: { fecha: true, peso_promedio_g: true },
    });

    let pesajesDescartados = 0;
    const pesoPorDia = new Map<number, { total: number; cantidad: number }>();
    for (const pesaje of pesajes) {
      const dia = diaDeVidaDeFecha(lote.fecha_ingreso, pesaje.fecha);
      if (dia < 1) {
        pesajesDescartados++;
        continue;
      }
      const acumulado = pesoPorDia.get(dia) ?? { total: 0, cantidad: 0 };
      acumulado.total += pesaje.peso_promedio_g;
      acumulado.cantidad += 1;
      pesoPorDia.set(dia, acumulado);
    }
    const pesajesParaMl = [...pesoPorDia.entries()]
      .sort(([diaA], [diaB]) => diaA - diaB)
      .map(([dia, peso]) => ({
        dia,
        peso: Number((peso.total / peso.cantidad).toFixed(2)),
      }));
    if (pesajesParaMl.length < 3) {
      throw new BadRequestException(
        'Se necesitan pesajes de al menos 3 días distintos para predecir',
      );
    }

    const ultimoDiaPesaje = pesajesParaMl[pesajesParaMl.length - 1].dia;
    if (ultimoDiaPesaje >= diaFaenaPlan) {
      throw new UnprocessableEntityException({
        codigo: 'horizonte_vencido',
        message: `El lote ya superó el día de proyección: el último pesaje es del día ${ultimoDiaPesaje} y el día de faena proyectado es ${diaFaenaPlan}`,
        dia_faena: diaFaenaPlan,
        ultimo_dia_observado: ultimoDiaPesaje,
      });
    }

    const respuesta = await this.llamarMl('/predecir', {
      pesajes: pesajesParaMl,
      dia_faena: diaFaenaPlan,
      peso_objetivo_g: pesoObjetivoPlan,
    });

    if (!respuesta?.ok) {
      throw new BadRequestException('El servicio de prediccion no respondio');
    }

    const cuerpoPrediccion = await this.leerJson(respuesta);
    if (!this.esRespuestaPeso(cuerpoPrediccion)) {
      throw new BadRequestException(
        'El servicio de predicción devolvió una respuesta inválida',
      );
    }
    const prediccion = cuerpoPrediccion;
    if (prediccion.dia_faena !== diaFaenaPlan) {
      this.logger.warn(
        `El modelo de peso devolvio dia_faena=${prediccion.dia_faena}, se pidio ${diaFaenaPlan}`,
      );
      throw new BadRequestException(
        'El servicio de predicción devolvió un día de faena inconsistente',
      );
    }
    if (prediccion.peso_objetivo_g !== pesoObjetivoPlan) {
      this.logger.warn(
        `El modelo de peso devolvio peso_objetivo_g=${prediccion.peso_objetivo_g}, se pidio ${pesoObjetivoPlan}`,
      );
      throw new BadRequestException(
        'El servicio de predicción devolvió un peso objetivo inconsistente',
      );
    }
    const mortalidad = await this.mortalidadProyectada(
      loteId,
      lote.fecha_ingreso,
      lote.cantidad_inicial,
      prediccion.dia_faena,
    );

    const consumo = await this.consumoProyectado(
      loteId,
      lote.fecha_ingreso,
      prediccion.dia_faena,
    );

    const mortalidadPct =
      mortalidad.estado === 'calculado'
        ? mortalidad.datos.mortalidad_proyectada_pct
        : null;
    const consumoKg =
      consumo.estado === 'calculado' ? consumo.datos.consumo_proyectado_kg : null;

    const fcr = this.calcularFcrProyectado(
      prediccion.peso_proyectado_faena_g,
      consumoKg,
      mortalidadPct,
      lote.cantidad_inicial,
    );
    const { modelo: modeloPeso, dias_al_objetivo, ...valoresPrediccion } =
      prediccion;
    const llegadaProyectada =
      dias_al_objetivo !== null
        ? {
            dia_vida: dias_al_objetivo,
            fecha: fechaDeVida(lote.fecha_ingreso, dias_al_objetivo),
          }
        : null;

    const omisiones: OmisionMagnitud[] = [
      ...(mortalidad.estado === 'horizonte_vencido'
        ? [
            {
              magnitud: 'mortalidad' as const,
              motivo: 'horizonte_vencido' as const,
              ultimo_dia_observado: mortalidad.ultimoDiaObservado,
            },
          ]
        : []),
      ...(consumo.estado === 'horizonte_vencido'
        ? [
            {
              magnitud: 'consumo' as const,
              motivo: 'horizonte_vencido' as const,
              ultimo_dia_observado: consumo.ultimoDiaObservado,
            },
          ]
        : []),
    ];

    const observacionesDescartadas: ObservacionesDescartadas = {
      pesajes: pesajesDescartados,
      mortalidades: mortalidad.descartadasPorIngreso,
      consumos: consumo.descartadasPorIngreso,
      motivo: 'antes_del_ingreso',
    };

    const resultado: ResultadoPrediccion & {
      lote_id: number;
      pesajes_usados: number;
    } = {
      lote_id: loteId,
      pesajes_usados: pesajesParaMl.length,
      plan_lote_id: plan.id,
      plan_version: plan.version,
      ...valoresPrediccion,
      mortalidad_proyectada_pct: mortalidadPct,
      consumo_proyectado_kg: consumoKg,
      fcr_proyectado: fcr,
      comparacion_objetivo: null,
      comparacion_objetivo_motivo:
        'plan_usa_curva_genetica_no_unificada_con_curvas_objetivo',
      llegada_proyectada: llegadaProyectada,
      omisiones,
      observaciones_descartadas: observacionesDescartadas,
      modelos: {
        ...(modeloPeso ? { peso: modeloPeso } : {}),
        ...(mortalidad.estado === 'calculado' && mortalidad.datos.modelo
          ? { mortalidad: mortalidad.datos.modelo }
          : {}),
        ...(consumo.estado === 'calculado' && consumo.datos.modelo
          ? { consumo: consumo.datos.modelo }
          : {}),
      },
    };

    // El mismo objeto en los dos casos, para que quien consuma la respuesta no
    // tenga que distinguir entre dos formas: null significa "no se guardo".
    const guardadas = persistir
      ? await this.guardar(loteId, lote.fecha_ingreso, resultado, pesajesParaMl)
      : null;
    return { ...resultado, predicciones_guardadas: guardadas };
  }

  // Cada magnitud proyectada se guarda como una fila propia: asi se puede
  // consultar el historial de una sola ("como ha ido cambiando el FCR
  // proyectado de este lote") sin desarmar un JSON. datos_entrada conserva los
  // pesajes que se usaron, que es lo que permite auditar por que el modelo
  // dijo lo que dijo.
  private async guardar(
    loteId: number,
    fechaIngreso: Date,
    r: ResultadoPrediccion,
    pesajes: Array<{ dia: number; peso: number }>,
  ) {
    const fechaObjetivo = fechaDeVida(fechaIngreso, r.dia_faena);
    const ultimoDia = pesajes[pesajes.length - 1]?.dia ?? 0;
    const horizonte = r.dia_faena - ultimoDia;
    const datosEntrada = {
      pesajes,
      dia_faena: r.dia_faena,
      version_calculo: 'predicciones-v2' as const,
      convencion_dia: 'dia_vida_desde_1' as const,
      origen_dia_faena: 'plan_lote' as const,
      peso_objetivo_origen: 'plan_lote' as const,
      peso_objetivo_g: r.peso_objetivo_g,
      plan_lote_id: r.plan_lote_id,
      plan_version: r.plan_version,
      llegada_proyectada_dia: r.llegada_proyectada?.dia_vida ?? null,
      omisiones: r.omisiones,
      observaciones_descartadas: r.observaciones_descartadas,
    } as unknown as Prisma.InputJsonValue;
    const [modeloPesoId, modeloMortalidadId, modeloConsumoId] =
      await Promise.all([
        this.resolverModeloOpcional(r.modelos?.peso),
        this.resolverModeloOpcional(r.modelos?.mortalidad),
        this.resolverModeloOpcional(r.modelos?.consumo),
      ]);

    const filas: Prisma.PrediccionCreateManyInput[] = [
      {
        lote_id: loteId,
        tipo: 'peso_faena',
        valor_predicho: r.peso_proyectado_faena_g,
        unidad: 'g',
        horizonte_dias: horizonte,
        fecha_objetivo: fechaObjetivo,
        datos_entrada: datosEntrada,
        modelo_id: modeloPesoId,
        confianza: r.modelos?.peso?.confianza,
      },
    ];

    if (r.mortalidad_proyectada_pct != null) {
      filas.push({
        lote_id: loteId,
        tipo: 'mortalidad',
        valor_predicho: r.mortalidad_proyectada_pct,
        unidad: '%',
        horizonte_dias: horizonte,
        fecha_objetivo: fechaObjetivo,
        datos_entrada: datosEntrada,
        modelo_id: modeloMortalidadId,
        confianza: r.modelos?.mortalidad?.confianza,
      });
    }

    if (r.consumo_proyectado_kg != null) {
      filas.push({
        lote_id: loteId,
        tipo: 'consumo',
        valor_predicho: r.consumo_proyectado_kg,
        unidad: 'kg',
        horizonte_dias: horizonte,
        fecha_objetivo: fechaObjetivo,
        datos_entrada: datosEntrada,
        modelo_id: modeloConsumoId,
        confianza: r.modelos?.consumo?.confianza,
      });
    }

    if (r.fcr_proyectado != null) {
      filas.push({
        lote_id: loteId,
        tipo: 'fcr',
        valor_predicho: r.fcr_proyectado,
        horizonte_dias: horizonte,
        fecha_objetivo: fechaObjetivo,
        datos_entrada: datosEntrada,
      });
    }

    await this.prisma.prediccion.createMany({ data: filas });
    return filas.length;
  }

  private resolverModeloOpcional(modelo?: MetadataModelo) {
    return modelo ? this.resolverModelo(modelo) : Promise.resolve(undefined);
  }

  private async resolverModelo(modelo: MetadataModelo): Promise<number> {
    const registrado = await this.prisma.modeloMl.upsert({
      where: {
        nombre_version: {
          nombre: modelo.nombre,
          version: modelo.version,
        },
      },
      update: {
        tipo: modelo.tipo,
        objetivo: modelo.objetivo,
        framework: modelo.framework,
      },
      create: {
        nombre: modelo.nombre,
        tipo: modelo.tipo,
        objetivo: modelo.objetivo,
        version: modelo.version,
        framework: modelo.framework,
        metricas: { origen: 'servicio-ml' },
      },
      select: { id: true },
    });
    return registrado.id;
  }

  async historial(
    loteId: number,
    solicitante: Solicitante,
    { page, limit }: PaginationQueryDto,
    tipo?: string,
  ) {
    await this.validarLote(loteId, solicitante);

    const where = { lote_id: loteId, ...(tipo ? { tipo } : {}) };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.prediccion.findMany({
        where,
        select: PREDICCION_SELECT,
        orderBy: { fecha_generacion: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.prediccion.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  private async validarLote(loteId: number, solicitante: Solicitante) {
    const lote = await this.prisma.lote.findUnique({
      where: { id: loteId },
      select: {
        galpon: { select: { granja: { select: { propietario_id: true } } } },
      },
    });
    if (!lote) throw new NotFoundException('Lote no encontrado');
    await verificarAccesoLote(
      this.prisma,
      loteId,
      solicitante,
      'Solo puedes consultar tus propios lotes',
      lote.galpon.granja.propietario_id,
    );
  }

  private async mortalidadProyectada(
    loteId: number,
    fechaIngreso: Date,
    cantidadInicial: number,
    diaFaena: number,
  ): Promise<MagnitudProyectada<RespuestaMortalidadMl>> {
    const registros = await this.prisma.registroMortalidad.findMany({
      where: { lote_id: loteId },
      orderBy: { fecha: 'asc' },
      select: { fecha: true, cantidad_aves: true },
    });

    let acumulado = 0;
    let descartadasPorIngreso = 0;
    const porDia = new Map<number, number>();
    for (const r of registros) {
      const dia = diaDeVidaDeFecha(fechaIngreso, r.fecha);
      if (dia < 1) {
        descartadasPorIngreso++;
        continue;
      }
      acumulado += r.cantidad_aves ?? 0;
      porDia.set(dia, (acumulado / cantidadInicial) * 100);
    }
    const mortalidadesParaMl = [...porDia.entries()].map(
      ([dia, mortalidad_pct]) => ({ dia, mortalidad_pct }),
    );

    if (mortalidadesParaMl.length < 3) {
      return { estado: 'sin_datos', descartadasPorIngreso };
    }

    const ultimoDia = mortalidadesParaMl[mortalidadesParaMl.length - 1].dia;
    if (ultimoDia >= diaFaena) {
      return {
        estado: 'horizonte_vencido',
        ultimoDiaObservado: ultimoDia,
        descartadasPorIngreso,
      };
    }

    const respuesta = await this.llamarMl('/predecir-mortalidad', {
      mortalidades: mortalidadesParaMl,
      dia_faena: diaFaena,
    });
    if (!respuesta?.ok) return { estado: 'sin_datos', descartadasPorIngreso };

    const cuerpo = await this.leerJson(respuesta);
    if (!this.esRespuestaMortalidad(cuerpo)) {
      this.logger.warn('Respuesta inválida del modelo de mortalidad');
      return { estado: 'sin_datos', descartadasPorIngreso };
    }
    if (cuerpo.dia_faena !== diaFaena) {
      this.logger.warn(
        `Mortalidad proyectada devolvio dia_faena=${cuerpo.dia_faena}, se pidio ${diaFaena} -- se descarta para no combinar horizontes distintos`,
      );
      return { estado: 'sin_datos', descartadasPorIngreso };
    }
    return { estado: 'calculado', datos: cuerpo, descartadasPorIngreso };
  }
  private async consumoProyectado(
    loteId: number,
    fechaIngreso: Date,
    diaFaena: number,
  ): Promise<MagnitudProyectada<RespuestaConsumoMl>> {
    const registros = await this.prisma.consumoDiario.findMany({
      where: { lote_id: loteId },
      orderBy: { fecha: 'asc' },
      select: { fecha: true, alimento_kg: true },
    });

    let acumulado = 0;
    let descartadasPorIngreso = 0;
    const porDia = new Map<number, number>();
    for (const r of registros) {
      const dia = diaDeVidaDeFecha(fechaIngreso, r.fecha);
      if (dia < 1) {
        descartadasPorIngreso++;
        continue;
      }
      acumulado += r.alimento_kg ?? 0;
      porDia.set(dia, acumulado);
    }

    const consumosParaMl = [...porDia.entries()].map(
      ([dia, consumo_acum_kg]) => ({ dia, consumo_acum_kg }),
    );
    if (consumosParaMl.length < 3) {
      return { estado: 'sin_datos', descartadasPorIngreso };
    }

    const ultimoDia = consumosParaMl[consumosParaMl.length - 1].dia;
    if (ultimoDia >= diaFaena) {
      return {
        estado: 'horizonte_vencido',
        ultimoDiaObservado: ultimoDia,
        descartadasPorIngreso,
      };
    }

    const respuesta = await this.llamarMl('/predecir-consumo', {
      consumos: consumosParaMl,
      dia_faena: diaFaena,
    });
    if (!respuesta?.ok) return { estado: 'sin_datos', descartadasPorIngreso };

    const cuerpo = await this.leerJson(respuesta);
    if (!this.esRespuestaConsumo(cuerpo)) {
      this.logger.warn('Respuesta inválida del modelo de consumo');
      return { estado: 'sin_datos', descartadasPorIngreso };
    }
    if (cuerpo.dia_faena !== diaFaena) {
      this.logger.warn(
        `Consumo proyectado devolvio dia_faena=${cuerpo.dia_faena}, se pidio ${diaFaena} -- se descarta para no combinar horizontes distintos`,
      );
      return { estado: 'sin_datos', descartadasPorIngreso };
    }
    return { estado: 'calculado', datos: cuerpo, descartadasPorIngreso };
  }
  private calcularFcrProyectado(
    pesoProyectadoG: number,
    consumoProyectadoKg: number | null,
    mortalidadProyectadaPct: number | null,
    cantidadInicial: number,
  ) {
    if (consumoProyectadoKg === null) return null;

    const avesVivas =
      cantidadInicial * (1 - (mortalidadProyectadaPct ?? 0) / 100);
    const gananciaKg = (pesoProyectadoG / 1000) * avesVivas;

    if (gananciaKg <= 0) return null;

    return Number((consumoProyectadoKg / gananciaKg).toFixed(2));
  }
  private async compararConObjetivo(
    sexo: string | null,
    marca: string | null,
    diaFaena: number,
    pesoProyectadoG: number,
    fcrProyectado: number | null,
  ) {
    const curva = await this.prisma.curvaObjetivo.findFirst({
      where: {
        marca: { equals: marca ?? 'italcol', mode: 'insensitive' },
        sexo: { equals: sexo ?? 'mixto', mode: 'insensitive' },
        dia: { lte: diaFaena },
      },
      orderBy: { dia: 'desc' },
    });
    if (!curva) return null;

    let desvioPesoPct: number | null = null;
    let veredictoPeso = 'sin_referencia';
    if (curva.peso_esperado_g != null) {
      desvioPesoPct = Number(
        (
          ((pesoProyectadoG - curva.peso_esperado_g) / curva.peso_esperado_g) *
          100
        ).toFixed(2),
      );
      if (desvioPesoPct < -UMBRAL_DESVIO_PCT) veredictoPeso = 'por_debajo';
      else if (desvioPesoPct > UMBRAL_DESVIO_PCT) veredictoPeso = 'por_encima';
      else veredictoPeso = 'en_objetivo';
    }

    let desvioFcr: number | null = null;
    let veredictoFcr = 'sin_referencia';
    if (fcrProyectado != null && curva.fcr_objetivo != null) {
      desvioFcr = Number((fcrProyectado - curva.fcr_objetivo).toFixed(2));
      if (desvioFcr < -UMBRAL_DESVIO_FCR) veredictoFcr = 'mejor_que_objetivo';
      else if (desvioFcr > UMBRAL_DESVIO_FCR)
        veredictoFcr = 'peor_que_objetivo';
      else veredictoFcr = 'en_objetivo';
    }

    return {
      dia_curva: curva.dia,
      marca: curva.marca,
      sexo: curva.sexo,
      peso_esperado_g: curva.peso_esperado_g,
      fcr_objetivo: curva.fcr_objetivo,
      desvio_peso_pct: desvioPesoPct,
      veredicto_peso: veredictoPeso,
      desvio_fcr: desvioFcr,
      veredicto_fcr: veredictoFcr,
    };
  }
  private async llamarMl(ruta: string, cuerpo: unknown) {
    const mlUrl = this.config.get<string>('ML_URL', 'http://ml:8000');
    const token = this.config.get<string>('ML_INTERNAL_TOKEN');
    const timeoutMs = Number(this.config.get<string>('ML_TIMEOUT_MS', '5000'));
    try {
      return await fetch(`${mlUrl}${ruta}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'X-ML-Token': token } : {}),
        },
        body: JSON.stringify(cuerpo),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      this.logger.warn(`El servicio ML no respondio en ${timeoutMs}ms`);
      return null;
    }
  }

  private async leerJson(respuesta: Response): Promise<unknown> {
    try {
      return (await respuesta.json()) as unknown;
    } catch {
      return null;
    }
  }

  private esRespuestaPeso(valor: unknown): valor is RespuestaPesoMl {
    if (!this.esRegistro(valor)) return false;
    return (
      this.esNumeroFinito(valor.peso_proyectado_faena_g, 0, 10_000) &&
      this.esEntero(valor.dia_faena, 1, 100) &&
      this.esNumeroFinito(valor.peso_objetivo_g, 0, 10_000) &&
      (valor.dias_al_objetivo === null ||
        this.esEntero(valor.dias_al_objetivo, 0, 100)) &&
      this.esMetadataOpcional(valor.modelo)
    );
  }

  private esRespuestaMortalidad(
    valor: unknown,
  ): valor is RespuestaMortalidadMl {
    return (
      this.esRegistro(valor) &&
      this.esNumeroFinito(valor.mortalidad_proyectada_pct, 0, 100) &&
      this.esEntero(valor.dia_faena, 1, 100) &&
      this.esMetadataOpcional(valor.modelo)
    );
  }

  private esRespuestaConsumo(valor: unknown): valor is RespuestaConsumoMl {
    return (
      this.esRegistro(valor) &&
      this.esNumeroFinito(valor.consumo_proyectado_kg, 0, 1_000_000) &&
      this.esEntero(valor.dia_faena, 1, 100) &&
      this.esMetadataOpcional(valor.modelo)
    );
  }

  private esMetadataOpcional(valor: unknown): boolean {
    if (valor === undefined) return true;
    return (
      this.esRegistro(valor) &&
      typeof valor.nombre === 'string' &&
      typeof valor.version === 'string' &&
      typeof valor.framework === 'string' &&
      typeof valor.tipo === 'string' &&
      typeof valor.objetivo === 'string' &&
      this.esNumeroFinito(valor.confianza, 0, 1) &&
      this.esEntero(valor.puntos_usados, 3, 100)
    );
  }

  private esRegistro(valor: unknown): valor is Record<string, unknown> {
    return typeof valor === 'object' && valor !== null;
  }

  private esNumeroFinito(valor: unknown, minimo: number, maximo: number) {
    return (
      typeof valor === 'number' &&
      Number.isFinite(valor) &&
      valor >= minimo &&
      valor <= maximo
    );
  }

  private esEntero(valor: unknown, minimo: number, maximo: number) {
    return (
      this.esNumeroFinito(valor, minimo, maximo) && Number.isInteger(valor)
    );
  }
}
