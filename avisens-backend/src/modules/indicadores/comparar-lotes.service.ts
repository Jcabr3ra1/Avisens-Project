import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Solicitante } from '../../common/auth/acceso';
import { verificarDueno } from '../../common/auth/acceso';
import {
  diaDeVida,
  diaDeVidaDeFecha,
  fechaDeVida,
} from '../../common/fechas/dias-de-vida';
import { PrismaService } from '../../prisma/prisma.service';

export interface PuntoDiaComparacion {
  fecha: string;
  peso_promedio_g: number | null;
  mortalidad_dia_aves: number;
  mortalidad_acumulada_aves: number;
  mortalidad_acumulada_pct: number;
  alimento_dia_kg: number;
  alimento_acumulado_kg: number;
  fcr: number | null;
}

export interface ResumenLoteComparado {
  id: number;
  codigo: string;
  estado: string;
  galpon_id: number;
  galpon: string;
  granja_id: number;
  granja: string;
  fecha_ingreso: string;
  fecha_salida_real: string | null;
  cantidad_inicial: number;
  cantidad_aves_vendidas: number | null;
  peso_promedio_final_g: number | null;
  mortalidad_acumulada_final_pct: number | null;
  fcr_final: number | null;
  duracion_dias: number;
}

export interface RespuestaComparacionLotes {
  lote_1: ResumenLoteComparado;
  lote_2: ResumenLoteComparado;
  dias_totales: number;
  serie: Array<{
    dia: number;
    lote_1: PuntoDiaComparacion | null;
    lote_2: PuntoDiaComparacion | null;
  }>;
}

interface LoteConDatos {
  id: number;
  codigo: string;
  estado: string;
  fecha_ingreso: Date;
  fecha_salida_real: Date | null;
  cantidad_inicial: number;
  cantidad_aves_vendidas: number | null;
  peso_promedio_final_g: number | null;
  mortalidad_acumulada_final_pct: number | null;
  fcr_final: number | null;
  galpon: {
    id: number;
    nombre: string;
    granja: { id: number; nombre: string; propietario_id: number };
  };
}

@Injectable()
export class CompararLotesService {
  constructor(private readonly prisma: PrismaService) {}

  async comparar(
    lote1Id: number,
    lote2Id: number,
    solicitante: Solicitante,
  ): Promise<RespuestaComparacionLotes> {
    if (lote1Id === lote2Id) {
      throw new BadRequestException(
        'Debes seleccionar dos lotes distintos para comparar',
      );
    }

    const ids = [lote1Id, lote2Id];
    const lotes = (await this.prisma.lote.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        codigo: true,
        estado: true,
        fecha_ingreso: true,
        fecha_salida_real: true,
        cantidad_inicial: true,
        cantidad_aves_vendidas: true,
        peso_promedio_final_g: true,
        mortalidad_acumulada_final_pct: true,
        fcr_final: true,
        galpon: {
          select: {
            id: true,
            nombre: true,
            granja: { select: { id: true, nombre: true, propietario_id: true } },
          },
        },
      },
    })) as LoteConDatos[];

    const porId = new Map(lotes.map((lote) => [lote.id, lote]));
    const lote1 = porId.get(lote1Id);
    const lote2 = porId.get(lote2Id);

    if (!lote1 || !lote2) {
      throw new NotFoundException('Uno o ambos lotes no fueron encontrados');
    }

    for (const lote of [lote1, lote2]) {
      verificarDueno(
        solicitante,
        lote.galpon.granja.propietario_id,
        'Solo puedes comparar lotes de tus propias granjas',
      );
    }

    const [pesajes, mortalidades, consumos, indicadores] = await Promise.all([
      this.prisma.pesaje.findMany({
        where: { lote_id: { in: ids } },
        select: { lote_id: true, fecha: true, peso_promedio_g: true },
        orderBy: { fecha: 'asc' },
      }),
      this.prisma.registroMortalidad.findMany({
        where: { lote_id: { in: ids } },
        select: { lote_id: true, fecha: true, cantidad_aves: true },
        orderBy: { fecha: 'asc' },
      }),
      this.prisma.consumoDiario.findMany({
        where: { lote_id: { in: ids } },
        select: { lote_id: true, fecha: true, alimento_kg: true },
        orderBy: { fecha: 'asc' },
      }),
      this.prisma.indicadorLote.findMany({
        where: { lote_id: { in: ids }, estado_calculo: 'calculado' },
        select: { lote_id: true, dia_vida: true, fcr: true },
        orderBy: { fecha: 'asc' },
      }),
    ]);

    const construido1 = this.construirLote(
      lote1,
      pesajes.filter((p) => p.lote_id === lote1.id),
      mortalidades.filter((m) => m.lote_id === lote1.id),
      consumos.filter((c) => c.lote_id === lote1.id),
      indicadores.filter((i) => i.lote_id === lote1.id),
    );
    const construido2 = this.construirLote(
      lote2,
      pesajes.filter((p) => p.lote_id === lote2.id),
      mortalidades.filter((m) => m.lote_id === lote2.id),
      consumos.filter((c) => c.lote_id === lote2.id),
      indicadores.filter((i) => i.lote_id === lote2.id),
    );

    const diasTotales = Math.max(
      construido1.resumen.duracion_dias,
      construido2.resumen.duracion_dias,
    );

    const serie: RespuestaComparacionLotes['serie'] = [];
    for (let dia = 1; dia <= diasTotales; dia++) {
      serie.push({
        dia,
        lote_1: construido1.puntos.get(dia) ?? null,
        lote_2: construido2.puntos.get(dia) ?? null,
      });
    }

    return {
      lote_1: construido1.resumen,
      lote_2: construido2.resumen,
      dias_totales: diasTotales,
      serie,
    };
  }

  private construirLote(
    lote: LoteConDatos,
    pesajes: Array<{ fecha: Date; peso_promedio_g: number }>,
    mortalidades: Array<{ fecha: Date; cantidad_aves: number }>,
    consumos: Array<{ fecha: Date; alimento_kg: number | null }>,
    indicadores: Array<{ dia_vida: number | null; fcr: number | null }>,
  ) {
    const pesajesPorDia = new Map<number, { total: number; cantidad: number }>();
    let maxDiaRegistro = 0;

    for (const pesaje of pesajes) {
      const dia = diaDeVidaDeFecha(lote.fecha_ingreso, pesaje.fecha);
      if (dia < 1) continue;
      if (dia > maxDiaRegistro) maxDiaRegistro = dia;
      const actual = pesajesPorDia.get(dia) ?? { total: 0, cantidad: 0 };
      actual.total += pesaje.peso_promedio_g;
      actual.cantidad += 1;
      pesajesPorDia.set(dia, actual);
    }

    const muertesPorDia = new Map<number, number>();
    for (const mortalidad of mortalidades) {
      const dia = diaDeVidaDeFecha(lote.fecha_ingreso, mortalidad.fecha);
      if (dia < 1) continue;
      if (dia > maxDiaRegistro) maxDiaRegistro = dia;
      muertesPorDia.set(
        dia,
        (muertesPorDia.get(dia) ?? 0) + mortalidad.cantidad_aves,
      );
    }

    const alimentoPorDia = new Map<number, number>();
    for (const consumo of consumos) {
      if (consumo.alimento_kg === null) continue;
      const dia = diaDeVidaDeFecha(lote.fecha_ingreso, consumo.fecha);
      if (dia < 1) continue;
      if (dia > maxDiaRegistro) maxDiaRegistro = dia;
      alimentoPorDia.set(
        dia,
        (alimentoPorDia.get(dia) ?? 0) + consumo.alimento_kg,
      );
    }

    const fcrPorDia = new Map<number, number>();
    for (const ind of indicadores) {
      if (ind.dia_vida !== null && ind.dia_vida >= 1 && ind.fcr !== null) {
        if (ind.dia_vida > maxDiaRegistro) maxDiaRegistro = ind.dia_vida;
        fcrPorDia.set(ind.dia_vida, Number(ind.fcr.toFixed(3)));
      }
    }

    const diaSalida = lote.fecha_salida_real
      ? Math.max(1, diaDeVidaDeFecha(lote.fecha_ingreso, lote.fecha_salida_real))
      : null;

    const duracionDias =
      diaSalida ??
      (lote.estado === 'activo'
        ? Math.max(1, diaDeVida(lote.fecha_ingreso), maxDiaRegistro)
        : Math.max(1, maxDiaRegistro));

    const puntos = new Map<number, PuntoDiaComparacion>();
    let muertesAcumuladas = 0;
    let alimentoAcumuladoKg = 0;

    for (let dia = 1; dia <= duracionDias; dia++) {
      const fecha = fechaDeVida(lote.fecha_ingreso, dia)
        .toISOString()
        .slice(0, 10);

      const muertesDia = muertesPorDia.get(dia) ?? 0;
      muertesAcumuladas += muertesDia;
      const mortalidadAcumuladaPct = Number(
        ((muertesAcumuladas / lote.cantidad_inicial) * 100).toFixed(2),
      );

      const alimentoDiaKg = Number((alimentoPorDia.get(dia) ?? 0).toFixed(2));
      alimentoAcumuladoKg = Number(
        (alimentoAcumuladoKg + alimentoDiaKg).toFixed(2),
      );

      const pesajeDia = pesajesPorDia.get(dia);
      let pesoPromedioG = pesajeDia
        ? Number((pesajeDia.total / pesajeDia.cantidad).toFixed(2))
        : null;
      if (
        pesoPromedioG === null &&
        diaSalida !== null &&
        dia === diaSalida &&
        lote.peso_promedio_final_g !== null
      ) {
        pesoPromedioG = lote.peso_promedio_final_g;
      }

      let fcr: number | null = fcrPorDia.get(dia) ?? null;
      if (
        fcr === null &&
        diaSalida !== null &&
        dia === diaSalida &&
        lote.fcr_final !== null
      ) {
        fcr = lote.fcr_final;
      }
      if (fcr === null && pesoPromedioG !== null && alimentoAcumuladoKg > 0) {
        const avesVivas = Math.max(0, lote.cantidad_inicial - muertesAcumuladas);
        const pesoTotalKg = (pesoPromedioG / 1000) * avesVivas;
        if (pesoTotalKg > 0) {
          fcr = Number((alimentoAcumuladoKg / pesoTotalKg).toFixed(3));
        }
      }

      puntos.set(dia, {
        fecha,
        peso_promedio_g: pesoPromedioG,
        mortalidad_dia_aves: muertesDia,
        mortalidad_acumulada_aves: muertesAcumuladas,
        mortalidad_acumulada_pct: mortalidadAcumuladaPct,
        alimento_dia_kg: alimentoDiaKg,
        alimento_acumulado_kg: alimentoAcumuladoKg,
        fcr,
      });
    }

    const resumen: ResumenLoteComparado = {
      id: lote.id,
      codigo: lote.codigo,
      estado: lote.estado,
      galpon_id: lote.galpon.id,
      galpon: lote.galpon.nombre,
      granja_id: lote.galpon.granja.id,
      granja: lote.galpon.granja.nombre,
      fecha_ingreso: lote.fecha_ingreso.toISOString().slice(0, 10),
      fecha_salida_real: lote.fecha_salida_real
        ? lote.fecha_salida_real.toISOString().slice(0, 10)
        : null,
      cantidad_inicial: lote.cantidad_inicial,
      cantidad_aves_vendidas: lote.cantidad_aves_vendidas,
      peso_promedio_final_g: lote.peso_promedio_final_g,
      mortalidad_acumulada_final_pct: lote.mortalidad_acumulada_final_pct,
      fcr_final: lote.fcr_final,
      duracion_dias: duracionDias,
    };

    return { resumen, puntos };
  }
}
