import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, SexoCurva } from '@prisma/client';
import type { Solicitante } from '../../common/auth/acceso';
import { filtroLotes } from '../../common/auth/alcance';
import { diaDeVida, inicioDelDiaEnZonaGranja } from '../../common/fechas/dias-de-vida';
import { PrismaService } from '../../prisma/prisma.service';
import { ResumenCrecimientoDto } from './dto/resumen-crecimiento.dto';
import { IndicadoresService } from './indicadores.service';
import {
  desvioDeConsumoPct,
  evaluarRiesgosCrecimiento,
  ordenarPorRiesgo,
  UMBRAL_DESVIO_CONSUMO_PCT_PROVISIONAL,
  UMBRAL_MORTALIDAD_ACUMULADA_PCT_PROVISIONAL,
} from './riesgo-crecimiento';

const MS_POR_DIA = 86_400_000;

type IndicadorReciente = {
  lote_id: number;
  fecha: Date;
  estado_calculo: string;
  estado_peso: string | null;
  dia_vida: number | null;
  peso_promedio_g: number | null;
  fcr: number | null;
  mortalidad_acumulada_pct: number | null;
  consumo_acumulado_g: number | null;
  pesaje_fecha_snapshot: Date | null;
};

function numero(valor: Prisma.Decimal | number | null): number | null {
  if (valor === null) return null;
  const resultado = Number(valor);
  return Number.isFinite(resultado) ? resultado : null;
}

function claveCurva(lineaId: number, sexo: string): string {
  return `${lineaId}:${sexo}`;
}

@Injectable()
export class ResumenCrecimientoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly indicadores: IndicadoresService,
  ) {}

  async obtener(solicitante: Solicitante, query: ResumenCrecimientoDto = {}) {
    const umbralPesajeTexto = this.config.get<string>('UMBRAL_PESAJE_DIAS');
    const valorUmbralPesaje = umbralPesajeTexto?.trim() ? Number(umbralPesajeTexto) : NaN;
    const umbralPesajeDias = Number.isFinite(valorUmbralPesaje) && valorUmbralPesaje >= 0
      ? valorUmbralPesaje
      : null;
    const and: Prisma.LoteWhereInput[] = [{ estado: 'activo' }];
    const alcance = filtroLotes(solicitante);
    if (alcance) and.push(alcance);
    if (query.granjaId !== undefined) and.push({ galpon: { granja_id: query.granjaId } });

    const lotes = await this.prisma.lote.findMany({
      where: { AND: and },
      orderBy: [{ codigo: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        codigo: true,
        fecha_ingreso: true,
        cantidad_inicial: true,
        linea_genetica_id: true,
        sexo: true,
        galpon: {
          select: {
            id: true,
            nombre: true,
            granja: { select: { id: true, nombre: true } },
          },
        },
      },
    });
    if (lotes.length === 0) {
      return {
        fecha: inicioDelDiaEnZonaGranja().toISOString().slice(0, 10),
        umbrales: {
          mortalidad_acumulada_pct_provisional: UMBRAL_MORTALIDAD_ACUMULADA_PCT_PROVISIONAL,
          desvio_consumo_pct_provisional: UMBRAL_DESVIO_CONSUMO_PCT_PROVISIONAL,
          pesaje_dias: umbralPesajeDias,
        },
        lotes: [],
        riesgos: [],
      };
    }

    const ids = lotes.map((lote) => lote.id);
    const indicadores = await this.prisma.indicadorLote.findMany({
      where: { lote_id: { in: ids } },
      orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
      select: {
        lote_id: true,
        fecha: true,
        estado_calculo: true,
        estado_peso: true,
        dia_vida: true,
        peso_promedio_g: true,
        fcr: true,
        mortalidad_acumulada_pct: true,
        consumo_acumulado_g: true,
        pesaje_fecha_snapshot: true,
      },
    }) as IndicadorReciente[];
    const recientePorLote = new Map<number, IndicadorReciente>();
    for (const indicador of indicadores) {
      if (!recientePorLote.has(indicador.lote_id)) recientePorLote.set(indicador.lote_id, indicador);
    }

    const combinaciones = [...new Map(lotes
      .filter((lote) => lote.linea_genetica_id !== null)
      .map((lote) => [claveCurva(lote.linea_genetica_id!, lote.sexo ?? 'mixto'), {
        linea_genetica_id: lote.linea_genetica_id!,
        sexo: (lote.sexo ?? 'mixto') as SexoCurva,
      }])).values()];
    const curvas = combinaciones.length === 0 ? [] : await this.prisma.curvaGeneticaVersion.findMany({
      where: { vigente: true, OR: combinaciones },
      select: {
        linea_genetica_id: true,
        sexo: true,
        puntos: { select: { dia: true, consumo_acumulado_g: true } },
      },
    });
    const curvaPorLote = new Map<string, (typeof curvas)[number]>();
    for (const curva of curvas) curvaPorLote.set(claveCurva(curva.linea_genetica_id, curva.sexo), curva);

    const hoy = inicioDelDiaEnZonaGranja();
    const filas = await Promise.all(lotes.map(async (lote) => {
      const indicador = recientePorLote.get(lote.id) ?? null;
      const calculado = indicador?.estado_calculo === 'calculado';
      let comparacion: Awaited<ReturnType<IndicadoresService['compararConCurva']>> | null = null;
      if (calculado) {
        comparacion = await this.indicadores.compararConCurva(lote.id, solicitante);
      }
      const diaVida = indicador?.dia_vida ?? diaDeVida(lote.fecha_ingreso);
      const curva = lote.linea_genetica_id === null
        ? null
        : curvaPorLote.get(claveCurva(lote.linea_genetica_id, lote.sexo ?? 'mixto')) ?? null;
      const puntoCurva = curva?.puntos.find((punto) => punto.dia === diaVida) ?? null;
      const consumoAcumuladoG = calculado ? numero(indicador.consumo_acumulado_g) : null;
      const consumoEsperadoG = puntoCurva ? numero(puntoCurva.consumo_acumulado_g) : null;
      const desvioConsumoPct = desvioDeConsumoPct(consumoAcumuladoG, consumoEsperadoG);
      const fechaPesaje = calculado && indicador.pesaje_fecha_snapshot
        ? indicador.pesaje_fecha_snapshot
        : null;
      const antiguedadPesajeDias = fechaPesaje === null
        ? null
        : Math.max(0, (hoy.getTime() - fechaPesaje.getTime()) / MS_POR_DIA);
      const estadoActual = calculado && comparacion?.estado_actual === 'calculado';
      const desvioPesoPct = estadoActual && comparacion && 'desvio_peso_pct' in comparacion
        ? comparacion.desvio_peso_pct ?? null
        : null;
      const mortalidadPct = calculado ? numero(indicador.mortalidad_acumulada_pct) : null;
      const alertas = evaluarRiesgosCrecimiento({
        veredictoPeso: estadoActual ? comparacion?.veredicto ?? null : null,
        desvioPesoPct,
        mortalidadAcumuladaPct: mortalidadPct,
        desvioConsumoPct,
        antiguedadPesajeDias,
        umbralPesajeDias,
      });
      return {
        lote_id: lote.id,
        codigo: lote.codigo,
        granja_id: lote.galpon.granja.id,
        granja: lote.galpon.granja.nombre,
        galpon_id: lote.galpon.id,
        galpon: lote.galpon.nombre,
        dia_vida: diaVida,
        estado_indicador: indicador?.estado_calculo ?? null,
        estado_peso: calculado ? indicador.estado_peso : null,
        peso_actual_g: estadoActual ? comparacion?.real?.peso_promedio_g ?? null : null,
        peso_esperado_g: estadoActual ? comparacion?.objetivo?.peso_esperado_g ?? null : null,
        veredicto_peso: estadoActual ? comparacion?.veredicto ?? null : null,
        desvio_peso_pct: desvioPesoPct,
        fcr: estadoActual ? comparacion?.real?.fcr ?? null : null,
        fcr_objetivo: estadoActual ? comparacion?.objetivo?.fcr_objetivo ?? null : null,
        mortalidad_acumulada_pct: mortalidadPct,
        consumo_acumulado_g: consumoAcumuladoG,
        consumo_esperado_g: consumoEsperadoG,
        desvio_consumo_pct: desvioConsumoPct,
        fecha_pesaje: fechaPesaje?.toISOString().slice(0, 10) ?? null,
        antiguedad_pesaje_dias: antiguedadPesajeDias,
        puntuacion: alertas.length,
        motivo_principal: alertas[0] ?? null,
        alertas,
      };
    }));

    const ordenados = ordenarPorRiesgo(filas);
    return {
      fecha: hoy.toISOString().slice(0, 10),
      umbrales: {
        mortalidad_acumulada_pct_provisional: UMBRAL_MORTALIDAD_ACUMULADA_PCT_PROVISIONAL,
        desvio_consumo_pct_provisional: UMBRAL_DESVIO_CONSUMO_PCT_PROVISIONAL,
        pesaje_dias: umbralPesajeDias,
      },
      lotes: ordenados.map((fila, indice) => ({ ...fila, posicion_riesgo: indice + 1 })),
      riesgos: ordenados.filter((fila) => fila.alertas.length > 0),
    };
  }
}
