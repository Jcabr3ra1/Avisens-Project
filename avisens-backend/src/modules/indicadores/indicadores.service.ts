import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { verificarDueno, Solicitante } from '../../common/acceso';

const PESO_INICIAL_G = 42;
const UMBRAL_DESVIO_PCT = 5;

@Injectable()
export class IndicadoresService {
  constructor(private prisma: PrismaService) {}

  private async verificarPropiedad(loteId: number, solicitante: Solicitante) {
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
      'Solo puedes gestionar indicadores de tus propios lotes',
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
      orderBy: { fecha: 'desc' },
      select: { peso_promedio_g: true },
    });

    const alimento = await this.prisma.consumoDiario.aggregate({
      where: { lote_id: loteId },
      _sum: { alimento_kg: true },
    });

    const mortalidad = await this.prisma.registroMortalidad.aggregate({
      where: { lote_id: loteId },
      _sum: { cantidad_aves: true },
    });

    const pesoActualG = ultimoPesaje?.peso_promedio_g ?? null;
    const alimentoKg = alimento._sum.alimento_kg ?? 0;
    const muertes = mortalidad._sum.cantidad_aves ?? 0;

    const avesVivas = lote.cantidad_inicial - muertes;
    const diaVida = Math.floor(
      (Date.now() - lote.fecha_ingreso.getTime()) / (1000 * 60 * 60 * 24),
    );
    const mortalidadPct = (muertes / lote.cantidad_inicial) * 100;

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

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    return this.prisma.indicadorLote.upsert({
      where: { lote_id_fecha: { lote_id: loteId, fecha: hoy } },
      update: {
        dia_vida: diaVida,
        peso_promedio_g: pesoActualG,
        fcr,
        epef,
        mortalidad_acumulada_pct: mortalidadPct,
        consumo_acumulado_g: consumoAcumuladoG,
      },
      create: {
        lote_id: loteId,
        fecha: hoy,
        dia_vida: diaVida,
        peso_promedio_g: pesoActualG,
        fcr,
        epef,
        mortalidad_acumulada_pct: mortalidadPct,
        consumo_acumulado_g: consumoAcumuladoG,
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

    const indicador = await this.prisma.indicadorLote.findFirst({
      where: { lote_id: loteId },
      orderBy: { fecha: 'desc' },
    });
    if (!indicador || indicador.dia_vida == null) {
      throw new NotFoundException(
        'No hay indicadores calculados para este lote todavia',
      );
    }

    const curva = await this.prisma.curvaObjetivo.findFirst({
      where: {
        marca: lote.marca_alimento ?? 'italcol',
        sexo: lote.sexo ?? 'mixto',
        dia: { lte: indicador.dia_vida },
      },
      orderBy: { dia: 'desc' },
    });
    if (!curva) {
      return {
        dia_vida: indicador.dia_vida,
        veredicto: 'sin_referencia',
        mensaje: 'No hay curva objetivo para la marca y sexo de este lote',
        real: {
          peso_promedio_g: indicador.peso_promedio_g,
          fcr: indicador.fcr,
        },
        objetivo: null,
      };
    }
    let desvioPesoPct: number | null = null;
    let veredicto = 'sin_datos';
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
      dia_vida: indicador.dia_vida,
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
}
