import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { Solicitante } from '../../common/auth/acceso';
import { verificarAccesoLote } from '../../common/auth/alcance';
import { PESO_INICIAL_G } from '../indicadores/indicadores.service';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';
import { ConfigService } from '@nestjs/config';

const UMBRAL_DESVIO_PCT = 5;
const UMBRAL_DESVIO_FCR = 0.05;
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

interface ResultadoPrediccion {
  peso_proyectado_faena_g: number;
  dia_faena: number;
  mortalidad_proyectada_pct: number | null;
  consumo_proyectado_kg: number | null;
  fcr_proyectado: number | null;
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
    const pesajes = await this.prisma.pesaje.findMany({
      where: { lote_id: loteId },
      orderBy: { fecha: 'asc' },
      select: { fecha: true, peso_promedio_g: true },
    });

    const inicio = lote.fecha_ingreso.getTime();
    const pesoPorDia = new Map<number, { total: number; cantidad: number }>();
    for (const pesaje of pesajes) {
      const dia = Math.round(
        (pesaje.fecha.getTime() - inicio) / (1000 * 60 * 60 * 24),
      );
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

    const respuesta = await this.llamarMl('/predecir', {
      pesajes: pesajesParaMl,
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

    const { modelo: modeloPeso, ...valoresPrediccion } = prediccion;
    const resultado = {
      lote_id: loteId,
      pesajes_usados: pesajesParaMl.length,
      ...valoresPrediccion,
      mortalidad_proyectada_pct: mortalidad?.mortalidad_proyectada_pct ?? null,
      consumo_proyectado_kg: consumo?.consumo_proyectado_kg ?? null,
      fcr_proyectado: fcr,
      comparacion_objetivo: comparacion,
      modelos: {
        ...(modeloPeso ? { peso: modeloPeso } : {}),
        ...(mortalidad?.modelo ? { mortalidad: mortalidad.modelo } : {}),
        ...(consumo?.modelo ? { consumo: consumo.modelo } : {}),
      },
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

    const cuerpo = await this.leerJson(respuesta);
    if (!this.esRespuestaMortalidad(cuerpo)) {
      this.logger.warn('Respuesta inválida del modelo de mortalidad');
      return null;
    }
    return cuerpo;
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

    const cuerpo = await this.leerJson(respuesta);
    if (!this.esRespuestaConsumo(cuerpo)) {
      this.logger.warn('Respuesta inválida del modelo de consumo');
      return null;
    }
    return cuerpo;
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
