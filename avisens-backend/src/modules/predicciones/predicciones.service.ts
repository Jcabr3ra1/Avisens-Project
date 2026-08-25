import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { verificarDueno, Solicitante } from '../../common/auth/acceso';
import { PESO_INICIAL_G } from '../indicadores/indicadores.service';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';

const ML_URL = process.env.ML_URL ?? 'http://ml:8000';
const UMBRAL_DESVIO_PCT = 5;
const UMBRAL_DESVIO_FCR = 0.05;
const ML_TIMEOUT_MS = 5000;
const MS_POR_DIA = 1000 * 60 * 60 * 24;

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
} as const;

interface ResultadoPrediccion {
  peso_proyectado_faena_g: number;
  dia_faena: number;
  mortalidad_proyectada_pct: number | null;
  consumo_proyectado_kg: number | null;
  fcr_proyectado: number | null;
}

@Injectable()
export class PrediccionesService {
  private readonly logger = new Logger(PrediccionesService.name);

  constructor(private prisma: PrismaService) {}

  async predecir(
    loteId: number,
    solicitante: Solicitante,
    persistir = false,
  ) {
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

    verificarDueno(
      solicitante,
      lote.galpon.granja.propietario_id,
      'Solo puedes predecir tus propios lotes',
    );
    const pesajes = await this.prisma.pesaje.findMany({
      where: { lote_id: loteId },
      orderBy: { fecha: 'asc' },
      select: { fecha: true, peso_promedio_g: true },
    });

    if (pesajes.length < 3) {
      throw new BadRequestException(
        'Se necesitan al menos 3 pesajes para predecir',
      );
    }
    const inicio = lote.fecha_ingreso.getTime();
    const pesajesParaMl = pesajes.map((p) => ({
      dia: Math.round((p.fecha.getTime() - inicio) / (1000 * 60 * 60 * 24)),
      peso: p.peso_promedio_g,
    }));

    const respuesta = await this.llamarMl('/predecir', {
      pesajes: pesajesParaMl,
    });

    if (!respuesta?.ok) {
      throw new BadRequestException('El servicio de prediccion no respondio');
    }

    const prediccion = (await respuesta.json()) as {
      peso_proyectado_faena_g: number;
      dia_faena: number;
      dias_al_objetivo: number | null;
      peso_objetivo_g: number;
    };
    const mortalidad = await this.mortalidadProyectada(
      loteId,
      inicio,
      lote.cantidad_inicial,
    );

    const consumo = await this.consumoProyectado(loteId, inicio);

    const fcr = this.calcularFcrProyectado(
      prediccion.peso_proyectado_faena_g,
      consumo?.consumo_proyectado_kg ?? null,
      mortalidad?.mortalidad_proyectada_pct ?? null,
      lote.cantidad_inicial,
    );

    const comparacion = await this.compararConObjetivo(
      lote.sexo,
      lote.marca_alimento,
      prediccion.dia_faena,
      prediccion.peso_proyectado_faena_g,
      fcr,
    );

    const resultado = {
      lote_id: loteId,
      pesajes_usados: pesajesParaMl.length,
      ...prediccion,
      mortalidad_proyectada_pct: mortalidad?.mortalidad_proyectada_pct ?? null,
      consumo_proyectado_kg: consumo?.consumo_proyectado_kg ?? null,
      fcr_proyectado: fcr,
      comparacion_objetivo: comparacion,
    };

    // El mismo objeto en los dos casos, para que quien consuma la respuesta no
    // tenga que distinguir entre dos formas: null significa "no se guardo".
    const guardadas = persistir
      ? await this.guardar(loteId, inicio, resultado, pesajesParaMl)
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
    inicioMs: number,
    r: ResultadoPrediccion,
    pesajes: Array<{ dia: number; peso: number }>,
  ) {
    const fechaObjetivo = new Date(inicioMs + r.dia_faena * MS_POR_DIA);
    const ultimoDia = pesajes[pesajes.length - 1]?.dia ?? 0;
    const horizonte = r.dia_faena - ultimoDia;
    const datosEntrada = { pesajes, dia_faena: r.dia_faena };

    const filas: Prisma.PrediccionCreateManyInput[] = [
      {
        lote_id: loteId,
        tipo: 'peso_faena',
        valor_predicho: r.peso_proyectado_faena_g,
        unidad: 'g',
        horizonte_dias: horizonte,
        fecha_objetivo: fechaObjetivo,
        datos_entrada: datosEntrada,
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
    verificarDueno(
      solicitante,
      lote.galpon.granja.propietario_id,
      'Solo puedes consultar tus propios lotes',
    );
  }

  private async mortalidadProyectada(
    loteId: number,
    inicio: number,
    cantidadInicial: number,
  ) {
    const registros = await this.prisma.registroMortalidad.findMany({
      where: { lote_id: loteId },
      orderBy: { fecha: 'asc' },
      select: { fecha: true, cantidad_aves: true },
    });

    let acumulado = 0;
    const porDia = new Map<number, number>();
    for (const r of registros) {
      acumulado += r.cantidad_aves ?? 0;
      const dia = Math.round(
        (r.fecha.getTime() - inicio) / (1000 * 60 * 60 * 24),
      );
      porDia.set(dia, (acumulado / cantidadInicial) * 100);
    }
    const mortalidadesParaMl = [...porDia.entries()].map(
      ([dia, mortalidad_pct]) => ({ dia, mortalidad_pct }),
    );

    if (mortalidadesParaMl.length < 3) return null;

    const respuesta = await this.llamarMl('/predecir-mortalidad', {
      mortalidades: mortalidadesParaMl,
    });
    if (!respuesta?.ok) return null;

    return (await respuesta.json()) as {
      mortalidad_proyectada_pct: number;
      dia_faena: number;
    };
  }
  private async consumoProyectado(loteId: number, inicio: number) {
    const registros = await this.prisma.consumoDiario.findMany({
      where: { lote_id: loteId },
      orderBy: { fecha: 'asc' },
      select: { fecha: true, alimento_kg: true },
    });

    let acumulado = 0;
    const porDia = new Map<number, number>();
    for (const r of registros) {
      acumulado += r.alimento_kg ?? 0;
      const dia = Math.round(
        (r.fecha.getTime() - inicio) / (1000 * 60 * 60 * 24),
      );
      porDia.set(dia, acumulado);
    }

    const consumosParaMl = [...porDia.entries()].map(
      ([dia, consumo_acum_kg]) => ({ dia, consumo_acum_kg }),
    );
    if (consumosParaMl.length < 3) return null;

    const respuesta = await this.llamarMl('/predecir-consumo', {
      consumos: consumosParaMl,
    });
    if (!respuesta?.ok) return null;

    return (await respuesta.json()) as {
      consumo_proyectado_kg: number;
      dia_faena: number;
    };
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
    const gananciaKg = ((pesoProyectadoG - PESO_INICIAL_G) / 1000) * avesVivas;

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
    try {
      return await fetch(`${ML_URL}${ruta}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
        signal: AbortSignal.timeout(ML_TIMEOUT_MS),
      });
    } catch {
      this.logger.warn(`El servicio ML no respondio en ${ML_TIMEOUT_MS}ms`);
      return null;
    }
  }
}
