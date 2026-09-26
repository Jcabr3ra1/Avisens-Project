import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { Solicitante } from '../../common/auth/acceso';
import { verificarAccesoLote } from '../../common/auth/alcance';
import { Prisma, Alerta } from '@prisma/client';
import {
  diaDeVida,
  inicioDelDiaEnZonaGranja,
} from '../../common/fechas/dias-de-vida';
import { clasificarMortalidad } from '../../common/mortalidad/mortalidad-snapshot';

export const PESO_INICIAL_G = 42;
const UMBRAL_DESVIO_PCT = 5;
const ALERTA_TIPO_DESVIO = 'desvio_peso';

export interface ResultadoAlertaDesvio {
  alerta: Alerta | null;
  motivo: string | null;
}

@Injectable()
export class IndicadoresService {
  private readonly logger = new Logger(IndicadoresService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  private async verificarPropiedad(loteId: number, solicitante: Solicitante) {
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
      'Solo puedes gestionar indicadores de tus propios lotes',
      lote.galpon.granja.propietario_id,
    );
  }

  async calcularParaLote(loteId: number) {
    const lote = await this.prisma.lote.findUnique({
      where: { id: loteId },
      select: {
        id: true,
        fecha_ingreso: true,
        cantidad_inicial: true,
        sexo: true,
      },
    });
    if (!lote) throw new NotFoundException('Lote no encontrado');

    const ultimoPesaje = await this.prisma.pesaje.findFirst({
      where: { lote_id: loteId },
      orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
      select: { id: true, fecha: true, peso_promedio_g: true },
    });

    const alimento = await this.prisma.consumoDiario.aggregate({
      where: { lote_id: loteId },
      _sum: { alimento_kg: true },
    });

    // La fila lleva el día que vive la granja. Con setHours() en un servidor
    // UTC, el job de las 02:00 —las 21:00 allá— la estampaba con la fecha de
    // mañana, y durante esas cinco horas el lote se comparaba contra la curva
    // del día siguiente.
    const hoy = inicioDelDiaEnZonaGranja();
    const diaVida = diaDeVida(lote.fecha_ingreso);

    // Contrato "aves vivas hoy": cantidad_inicial - muertes validadas hasta
    // el dia de vida de HOY. No es avesVivasEnDia() -- esa lleva la
    // convencion de muerte al fin del dia, pensada para alimento, no para
    // reportar el conteo actual.
    const registrosMortalidad = await this.prisma.registroMortalidad.findMany(
      {
        where: { lote_id: loteId },
        select: { fecha: true, cantidad_aves: true },
      },
    );
    const clasificacion = clasificarMortalidad(
      lote.fecha_ingreso,
      registrosMortalidad.map((r) => ({
        fecha: r.fecha,
        cantidadAves: r.cantidad_aves,
      })),
      diaVida,
      lote.cantidad_inicial,
    );

    // Estado del peso: independiente de si la mortalidad es coherente. Un
    // pesaje con fecha futura NO se sustituye por uno anterior -- se marca
    // como no disponible, visible, para que alguien lo corrija.
    let estadoPeso: 'disponible' | 'pesaje_fecha_futura' | 'sin_pesaje';
    if (!ultimoPesaje) {
      estadoPeso = 'sin_pesaje';
    } else if (ultimoPesaje.fecha > hoy) {
      estadoPeso = 'pesaje_fecha_futura';
    } else {
      estadoPeso = 'disponible';
    }
    const pesoActualG =
      estadoPeso === 'disponible' ? ultimoPesaje!.peso_promedio_g : null;
    const pesajeIdSnapshot = ultimoPesaje?.id ?? null;
    const pesajeFechaSnapshot = ultimoPesaje?.fecha ?? null;

    const datosComunes = {
      dia_vida: diaVida,
      estado_peso: estadoPeso,
      pesaje_id_snapshot: pesajeIdSnapshot,
      pesaje_fecha_snapshot: pesajeFechaSnapshot,
      calculado_en: new Date(),
    };

    if (!clasificacion.valido) {
      const datosIncoherente = {
        ...datosComunes,
        estado_calculo: 'mortalidad_incoherente' as const,
        peso_promedio_g: null,
        fcr: null,
        epef: null,
        mortalidad_acumulada_pct: null,
        consumo_acumulado_g: null,
      };
      return this.prisma.indicadorLote.upsert({
        where: { lote_id_fecha: { lote_id: loteId, fecha: hoy } },
        update: { ...datosIncoherente, revision_calculo: { increment: 1 } },
        create: {
          lote_id: loteId,
          fecha: hoy,
          ...datosIncoherente,
          revision_calculo: 1,
        },
      });
    }

    const alimentoKg = alimento._sum.alimento_kg ?? 0;
    const avesVivas = clasificacion.avesVivasAlCorte;
    const mortalidadPct =
      (clasificacion.muertesAlCorte / lote.cantidad_inicial) * 100;

    let fcr: number | null = null;
    if (pesoActualG !== null && avesVivas > 0) {
      const gananciaKg = ((pesoActualG - PESO_INICIAL_G) / 1000) * avesVivas;
      if (gananciaKg > 0) {
        fcr = alimentoKg / gananciaKg;
      }
    }
    let epef: number | null = null;
    if (fcr !== null && diaVida > 0 && pesoActualG !== null) {
      const viabilidadPct = 100 - mortalidadPct;
      const pesoKg = pesoActualG / 1000;
      epef = ((viabilidadPct * pesoKg) / (diaVida * fcr)) * 100;
    }
    const consumoAcumuladoG =
      avesVivas > 0 ? (alimentoKg * 1000) / avesVivas : null;

    const datosCalculado = {
      ...datosComunes,
      estado_calculo: 'calculado' as const,
      peso_promedio_g: pesoActualG,
      fcr,
      epef,
      mortalidad_acumulada_pct: mortalidadPct,
      consumo_acumulado_g: consumoAcumuladoG,
    };

    return this.prisma.indicadorLote.upsert({
      where: { lote_id_fecha: { lote_id: loteId, fecha: hoy } },
      update: { ...datosCalculado, revision_calculo: { increment: 1 } },
      create: {
        lote_id: loteId,
        fecha: hoy,
        ...datosCalculado,
        revision_calculo: 1,
      },
    });
  }

  async calcular(loteId: number, solicitante: Solicitante) {
    await this.verificarPropiedad(loteId, solicitante);
    return this.calcularParaLote(loteId);
  }

  async listar(loteId: number, solicitante: Solicitante) {
    await this.verificarPropiedad(loteId, solicitante);
    return this.prisma.indicadorLote.findMany({
      where: { lote_id: loteId },
      orderBy: { fecha: 'asc' },
    });
  }

  async compararConCurva(loteId: number, solicitante: Solicitante) {
    await this.verificarPropiedad(loteId, solicitante);

    const lote = await this.prisma.lote.findUnique({
      where: { id: loteId },
      select: { sexo: true, marca_alimento: true },
    });
    if (!lote) throw new NotFoundException('Lote no encontrado');

    const masReciente = await this.prisma.indicadorLote.findFirst({
      where: { lote_id: loteId },
      orderBy: { fecha: 'desc' },
    });
    if (!masReciente) {
      throw new NotFoundException(
        'No hay indicadores calculados para este lote todavia',
      );
    }

    const indicador = await this.prisma.indicadorLote.findFirst({
      where: { lote_id: loteId, estado_calculo: 'calculado' },
      orderBy: { fecha: 'desc' },
    });
    if (!indicador || indicador.dia_vida == null) {
      return {
        estado_actual: masReciente.estado_calculo,
        fecha_estado_actual: masReciente.fecha,
        fecha_del_dato_usado: null,
        dia_vida: null,
        veredicto: 'sin_dato_valido' as const,
        mensaje: 'No hay un indicador calculado todavia para comparar',
        real: null,
        objetivo: null,
      };
    }

    const base = {
      estado_actual: masReciente.estado_calculo,
      fecha_estado_actual: masReciente.fecha,
      fecha_del_dato_usado: indicador.fecha,
      dia_vida: indicador.dia_vida,
    };

    if (indicador.estado_peso !== 'disponible') {
      return {
        ...base,
        veredicto: 'peso_no_disponible' as const,
        mensaje: 'El peso del dato usado no esta disponible',
        real: null,
        objetivo: null,
      };
    }

    const curva = await this.prisma.curvaObjetivo.findFirst({
      where: {
        marca: {
          equals: lote.marca_alimento ?? 'italcol',
          mode: 'insensitive',
        },
        sexo: { equals: lote.sexo ?? 'mixto', mode: 'insensitive' },
        dia: { lte: indicador.dia_vida },
      },
      orderBy: { dia: 'desc' },
    });

    if (!curva) {
      return {
        ...base,
        veredicto: 'sin_referencia' as const,
        mensaje: 'No hay curva objetivo para la marca y sexo de este lote',
        real: {
          peso_promedio_g: indicador.peso_promedio_g,
          fcr: indicador.fcr,
        },
        objetivo: null,
      };
    }

    let desvioPesoPct: number | null = null;
    let veredicto: 'sin_datos' | 'por_debajo' | 'por_encima' | 'en_objetivo' =
      'sin_datos';
    if (indicador.peso_promedio_g != null && curva.peso_esperado_g != null) {
      desvioPesoPct =
        ((indicador.peso_promedio_g - curva.peso_esperado_g) /
          curva.peso_esperado_g) *
        100;

      if (desvioPesoPct < -UMBRAL_DESVIO_PCT) veredicto = 'por_debajo';
      else if (desvioPesoPct > UMBRAL_DESVIO_PCT) veredicto = 'por_encima';
      else veredicto = 'en_objetivo';
    }

    const desvioFcr =
      indicador.fcr != null && curva.fcr_objetivo != null
        ? indicador.fcr - curva.fcr_objetivo
        : null;

    return {
      ...base,
      dia_curva: curva.dia,
      veredicto,
      real: {
        peso_promedio_g: indicador.peso_promedio_g,
        fcr: indicador.fcr,
      },
      objetivo: {
        peso_esperado_g: curva.peso_esperado_g,
        fcr_objetivo: curva.fcr_objetivo,
      },
      desvio_peso_pct: desvioPesoPct,
      desvio_fcr: desvioFcr,
    };
  }

  async generarAlertaDesvio(loteId: number): Promise<ResultadoAlertaDesvio> {
    const indicador = await this.prisma.indicadorLote.findFirst({
      where: { lote_id: loteId },
      orderBy: { fecha: 'desc' },
    });
    if (!indicador) {
      return { alerta: null, motivo: 'sin_indicador' };
    }

    // Parada 1: la fila mas reciente no es un calculo publicable.
    if (indicador.estado_calculo !== 'calculado') {
      this.logger.warn(
        `Lote ${loteId}: sin alerta de desvio (${indicador.estado_calculo})`,
      );
      return { alerta: null, motivo: indicador.estado_calculo };
    }

    // Parada 2: la fila no es de hoy -- no se alerta con un dia viejo.
    const hoy = inicioDelDiaEnZonaGranja();
    if (indicador.fecha.getTime() !== hoy.getTime()) {
      this.logger.warn(`Lote ${loteId}: sin alerta de desvio (no_es_de_hoy)`);
      return { alerta: null, motivo: 'no_es_de_hoy' };
    }

    // Parada 3: la fuente pudo cambiar despues de calcular (pesaje editado,
    // borrado, movido a otro lote, o uno mas nuevo registrado despues).
    const pesajeMasReciente = await this.prisma.pesaje.findFirst({
      where: { lote_id: loteId },
      orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
      select: { id: true, fecha: true, peso_promedio_g: true },
    });
    const idCoincide =
      (pesajeMasReciente?.id ?? null) === indicador.pesaje_id_snapshot;
    const fechaCoincide =
      (pesajeMasReciente?.fecha?.getTime() ?? null) ===
      (indicador.pesaje_fecha_snapshot?.getTime() ?? null);
    const pesoCoincide =
      indicador.estado_peso !== 'disponible' ||
      (pesajeMasReciente?.peso_promedio_g ?? null) ===
        indicador.peso_promedio_g;
    if (!idCoincide || !fechaCoincide || !pesoCoincide) {
      this.logger.warn(
        `Lote ${loteId}: sin alerta de desvio (fuente_cambiada)`,
      );
      return { alerta: null, motivo: 'fuente_cambiada' };
    }

    // Parada 4: el pesaje snapshot tiene fecha futura -- no se sustituye
    // por uno anterior, se detiene.
    if (indicador.estado_peso === 'pesaje_fecha_futura') {
      this.logger.warn(
        `Lote ${loteId}: sin alerta de desvio (pesaje_fecha_futura)`,
      );
      return { alerta: null, motivo: 'pesaje_fecha_futura' };
    }

    // Parada 5: sin pesaje, sin umbral configurado, o el pesaje supera el
    // umbral. El umbral NO tiene valor por defecto en codigo -- si no esta
    // configurado, se detiene igual, nunca se alerta con un umbral inventado.
    if (indicador.estado_peso === 'sin_pesaje') {
      this.logger.warn(`Lote ${loteId}: sin alerta de desvio (sin_pesaje)`);
      return { alerta: null, motivo: 'sin_pesaje' };
    }
    const umbralDiasTexto = this.config.get<string>('UMBRAL_PESAJE_DIAS');
    const umbralDias = umbralDiasTexto ? Number(umbralDiasTexto) : NaN;
    if (Number.isNaN(umbralDias)) {
      this.logger.warn(
        `Lote ${loteId}: sin alerta de desvio (umbral_no_configurado)`,
      );
      return { alerta: null, motivo: 'umbral_no_configurado' };
    }
    const msPorDia = 24 * 60 * 60 * 1000;
    const antiguedadDias =
      (hoy.getTime() - indicador.pesaje_fecha_snapshot!.getTime()) / msPorDia;
    if (antiguedadDias > umbralDias) {
      this.logger.warn(
        `Lote ${loteId}: sin alerta de desvio (pesaje_desactualizado, ${antiguedadDias} dias)`,
      );
      return { alerta: null, motivo: 'pesaje_desactualizado' };
    }

    const lote = await this.prisma.lote.findUnique({
      where: { id: loteId },
      select: { galpon_id: true, sexo: true, marca_alimento: true },
    });
    if (!lote || indicador.dia_vida == null) {
      return { alerta: null, motivo: 'sin_indicador' };
    }

    const curva = await this.prisma.curvaObjetivo.findFirst({
      where: {
        marca: {
          equals: lote.marca_alimento ?? 'italcol',
          mode: 'insensitive',
        },
        sexo: { equals: lote.sexo ?? 'mixto', mode: 'insensitive' },
        dia: { lte: indicador.dia_vida },
      },
      orderBy: { dia: 'desc' },
    });
    if (
      !curva ||
      indicador.peso_promedio_g == null ||
      curva.peso_esperado_g == null
    ) {
      return { alerta: null, motivo: 'sin_referencia' };
    }
    const desvioPesoPct =
      ((indicador.peso_promedio_g - curva.peso_esperado_g) /
        curva.peso_esperado_g) *
      100;
    if (desvioPesoPct >= -UMBRAL_DESVIO_PCT) {
      return { alerta: null, motivo: 'no_por_debajo' };
    }

    const yaExiste = await this.prisma.alerta.findFirst({
      where: {
        lote_id: loteId,
        tipo: ALERTA_TIPO_DESVIO,
        origen: 'automatica',
        estado: { in: ['abierta', 'en_proceso'] },
      },
    });
    if (yaExiste) {
      return { alerta: null, motivo: 'ya_existe_alerta' };
    }

    const alerta = await this.prisma.alerta.create({
      data: {
        galpon_id: lote.galpon_id,
        lote_id: loteId,
        tipo: ALERTA_TIPO_DESVIO,
        criticidad: 'media',
        origen: 'automatica',
        mensaje: `El lote va ${desvioPesoPct.toFixed(1)}% por debajo de la curva objetivo (dia ${indicador.dia_vida})`,
      },
    });
    return { alerta, motivo: null };
  }

  async kpisFinancieros(loteId: number, solicitante: Solicitante) {
    await this.verificarPropiedad(loteId, solicitante);

    const lote = await this.prisma.lote.findUnique({
      where: { id: loteId },
      select: { cantidad_inicial: true },
    });
    if (!lote) throw new NotFoundException('Lote no encontrado');

    const masReciente = await this.prisma.indicadorLote.findFirst({
      where: { lote_id: loteId },
      orderBy: { fecha: 'desc' },
      select: { estado_calculo: true, fecha: true },
    });

    const indicador = await this.prisma.indicadorLote.findFirst({
      where: { lote_id: loteId, estado_calculo: 'calculado' },
      orderBy: { fecha: 'desc' },
      select: {
        fecha: true,
        estado_peso: true,
        peso_promedio_g: true,
        mortalidad_acumulada_pct: true,
      },
    });

    const egresos = await this.prisma.movimientoFinanciero.aggregate({
      where: { lote_id: loteId, tipo: 'egreso' },
      _sum: { valor_cop: true },
    });
    const ingresos = await this.prisma.movimientoFinanciero.aggregate({
      where: { lote_id: loteId, tipo: 'ingreso' },
      _sum: { valor_cop: true },
    });

    const costoTotal = egresos._sum.valor_cop ?? new Prisma.Decimal(0);
    const ingresoTotal = ingresos._sum.valor_cop ?? new Prisma.Decimal(0);
    const margen = ingresoTotal.minus(costoTotal);
    const roiPct = costoTotal.gt(0)
      ? margen.div(costoTotal).mul(100).toNumber()
      : null;

    // Sin ningun indicador calculado, o el calculado no tiene el peso
    // disponible: no hay como saber cuantos kg produjo el lote. Ausencia
    // explicita (null), nunca un 0 que finja que si se sabe.
    const datosProduccion =
      indicador && indicador.estado_peso === 'disponible'
        ? {
            avesVivas:
              lote.cantidad_inicial *
              (1 - (indicador.mortalidad_acumulada_pct ?? 0) / 100),
            pesoPromedioG: indicador.peso_promedio_g,
          }
        : null;

    const kgProducidos =
      datosProduccion && datosProduccion.pesoPromedioG != null
        ? (datosProduccion.pesoPromedioG / 1000) * datosProduccion.avesVivas
        : null;
    const costoPorKg =
      kgProducidos != null && kgProducidos > 0
        ? costoTotal.div(kgProducidos).toNumber()
        : null;

    return {
      lote_id: loteId,
      estado_actual: masReciente?.estado_calculo ?? 'sin_indicador',
      fecha_estado_actual: masReciente?.fecha ?? null,
      fecha_del_dato_usado: indicador?.fecha ?? null,
      costo_total_cop: costoTotal,
      ingreso_total_cop: ingresoTotal,
      margen_cop: margen,
      kg_producidos: kgProducidos != null ? Math.round(kgProducidos) : null,
      costo_por_kg_cop: costoPorKg,
      roi_pct: roiPct,
    };
  }
}
