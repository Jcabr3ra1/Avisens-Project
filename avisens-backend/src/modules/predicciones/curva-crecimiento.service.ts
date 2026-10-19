import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { SexoCurva } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { Solicitante } from '../../common/auth/acceso';
import { verificarAccesoLote } from '../../common/auth/alcance';
import {
  diaDeVida,
  diaDeVidaDeFecha,
  fechaDeVida,
} from '../../common/fechas/dias-de-vida';
import { PESO_MAXIMO_POLLO_G } from '../../common/avicultura/vocabulario';
import { ClienteMlService } from './cliente-ml.service';

const DIA_FINAL_POR_DEFECTO = 42;
const MARGEN_PLAUSIBLE = { minimo: 0.4, maximo: 1.6 } as const;
const DIA_MAXIMO_ML = 100;

interface PuntoPeso {
  dia: number;
  peso: number;
}

export function estandarEnDia(puntos: PuntoPeso[], dia: number): number | null {
  const exacto = puntos.find((p) => p.dia === dia);
  if (exacto) return exacto.peso;
  const antes = [...puntos].reverse().find((p) => p.dia < dia);
  const despues = puntos.find((p) => p.dia > dia);
  if (!antes || !despues) return null;
  const avance = (dia - antes.dia) / (despues.dia - antes.dia);
  return antes.peso + (despues.peso - antes.peso) * avance;
}

interface RespuestaCurvaMl {
  serie: { dia: number; peso_g: number; min_g: number; max_g: number }[];
  peso_final_g: number;
  dia_al_objetivo: number | null;
  punto_inflexion: { dia: number; peso_g: number; ganancia_max_g_dia: number };
  modelo: {
    nombre: string;
    version: string;
    confianza: number;
    puntos_usados: number;
  };
}

@Injectable()
export class CurvaCrecimientoService {
  constructor(
    private prisma: PrismaService,
    private clienteMl: ClienteMlService,
  ) {}

  async calcular(loteId: number, solicitante: Solicitante) {
    const lote = await this.prisma.lote.findUnique({
      where: { id: loteId },
      select: {
        codigo: true,
        fecha_ingreso: true,
        sexo: true,
        marca_alimento: true,
        linea_genetica_id: true,
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

    const sexo = (lote.sexo ?? 'mixto') as SexoCurva;
    const [pesajes, genetica, marca, plan] = await Promise.all([
      this.pesajesPorDia(loteId, lote.fecha_ingreso),
      this.curvaGenetica(lote.linea_genetica_id, sexo),
      this.curvaDeMarca(lote.marca_alimento, sexo),
      this.prisma.planLote.findFirst({
        where: { lote_id: loteId, vigente: true },
        select: { dia_objetivo: true, peso_objetivo_g: true },
      }),
    ]);
    if (pesajes.length === 0) {
      throw new UnprocessableEntityException({
        codigo: 'sin_pesajes',
        message: 'El lote necesita al menos un pesaje para proyectar su curva',
      });
    }

    const fueraDeRango = pesajes.find((p) => p.peso > PESO_MAXIMO_POLLO_G);
    if (fueraDeRango) {
      throw new UnprocessableEntityException({
        codigo: 'pesaje_fuera_de_rango',
        message: `El pesaje del día ${fueraDeRango.dia} de vida marca ${fueraDeRango.peso.toLocaleString('es-CO')} g por ave, que no es posible. Corrígelo en la Bitácora para ver la curva.`,
      });
    }

    if (genetica) {
      for (const pesaje of pesajes) {
        const esperado = estandarEnDia(genetica.puntos, pesaje.dia);
        if (esperado === null) continue;
        const proporcion = pesaje.peso / esperado;
        if (
          proporcion < MARGEN_PLAUSIBLE.minimo ||
          proporcion > MARGEN_PLAUSIBLE.maximo
        ) {
          throw new UnprocessableEntityException({
            codigo: 'pesaje_inverosimil',
            message: `El pesaje del día ${pesaje.dia} de vida marca ${pesaje.peso.toLocaleString('es-CO')} g por ave, pero a esa edad un ${genetica.linea} pesa cerca de ${Math.round(esperado).toLocaleString('es-CO')} g. Revísalo en la Bitácora para ver la curva.`,
          });
        }
      }
    }

    const ultimo = pesajes[pesajes.length - 1];
    const diaFinal = Math.min(
      DIA_MAXIMO_ML,
      Math.max(plan?.dia_objetivo ?? DIA_FINAL_POR_DEFECTO, ultimo.dia + 1),
    );
    const pesoObjetivo = plan ? Number(plan.peso_objetivo_g) : null;

    const respuesta = await this.clienteMl.llamar('/curva-crecimiento', {
      pesajes,
      dia_final: diaFinal,
      curva_referencia: genetica?.puntos ?? [],
      peso_objetivo_g: pesoObjetivo,
    });
    if (!respuesta) {
      throw new BadRequestException('El servicio de predicción no respondió');
    }
    if (!respuesta.ok) {
      throw new BadRequestException(
        'El servicio de predicción rechazó los datos del lote',
      );
    }
    const cuerpo = await this.clienteMl.leerJson(respuesta);
    if (!this.esRespuestaValida(cuerpo, diaFinal)) {
      throw new BadRequestException(
        'El servicio de predicción devolvió una respuesta inválida',
      );
    }

    const real = new Map(pesajes.map((p) => [p.dia, p.peso]));
    const estandar = new Map(genetica?.puntos.map((p) => [p.dia, p.peso]));
    const deMarca = new Map(marca?.puntos.map((p) => [p.dia, p.peso]));
    const estandarAlUltimo = estandar.get(ultimo.dia);

    return {
      lote_id: loteId,
      codigo: lote.codigo,
      dia_actual: diaDeVida(lote.fecha_ingreso),
      dia_final: diaFinal,
      peso_objetivo_g: pesoObjetivo,
      referencias: {
        genetica: genetica
          ? {
              linea: genetica.linea,
              sexo,
              version: genetica.version,
              fuente: genetica.fuente,
            }
          : null,
        marca: marca ? { marca: marca.marca } : null,
      },
      serie: cuerpo.serie.map((p) => ({
        dia: p.dia,
        real_g: real.get(p.dia) ?? null,
        proyectado_g: p.peso_g,
        min_g: p.min_g,
        max_g: p.max_g,
        estandar_g: estandar.get(p.dia) ?? null,
        marca_g: deMarca.get(p.dia) ?? null,
      })),
      resumen: {
        ultimo_pesaje: { dia: ultimo.dia, peso_g: ultimo.peso },
        desvio_vs_estandar_pct: estandarAlUltimo
          ? Number(
              (
                ((ultimo.peso - estandarAlUltimo) / estandarAlUltimo) *
                100
              ).toFixed(1),
            )
          : null,
        peso_final_g: cuerpo.peso_final_g,
        dia_al_objetivo: cuerpo.dia_al_objetivo,
        fecha_al_objetivo:
          cuerpo.dia_al_objetivo === null
            ? null
            : fechaDeVida(
                lote.fecha_ingreso,
                Math.ceil(cuerpo.dia_al_objetivo),
              ),
        punto_inflexion: cuerpo.punto_inflexion,
      },
      modelo: cuerpo.modelo,
    };
  }

  private async pesajesPorDia(
    loteId: number,
    fechaIngreso: Date,
  ): Promise<PuntoPeso[]> {
    const pesajes = await this.prisma.pesaje.findMany({
      where: { lote_id: loteId },
      select: { fecha: true, peso_promedio_g: true },
    });

    const porDia = new Map<number, { total: number; cantidad: number }>();
    for (const pesaje of pesajes) {
      const dia = diaDeVidaDeFecha(fechaIngreso, pesaje.fecha);
      if (dia < 1 || dia >= DIA_MAXIMO_ML) continue;
      const acumulado = porDia.get(dia) ?? { total: 0, cantidad: 0 };
      acumulado.total += pesaje.peso_promedio_g;
      acumulado.cantidad += 1;
      porDia.set(dia, acumulado);
    }

    return [...porDia.entries()]
      .sort(([diaA], [diaB]) => diaA - diaB)
      .map(([dia, { total, cantidad }]) => ({
        dia,
        peso: Number((total / cantidad).toFixed(2)),
      }));
  }

  private async curvaGenetica(lineaId: number | null, sexo: SexoCurva) {
    if (lineaId === null) return null;
    const curva = await this.prisma.curvaGeneticaVersion.findFirst({
      where: { linea_genetica_id: lineaId, sexo, vigente: true },
      select: {
        version: true,
        fuente: true,
        linea_genetica: { select: { nombre: true } },
        puntos: {
          orderBy: { dia: 'asc' },
          select: { dia: true, peso_esperado_g: true },
        },
      },
    });
    if (!curva) return null;
    return {
      linea: curva.linea_genetica.nombre,
      version: curva.version,
      fuente: curva.fuente,
      puntos: curva.puntos.map((p) => ({
        dia: p.dia,
        peso: Number(p.peso_esperado_g),
      })),
    };
  }

  private async curvaDeMarca(marca: string | null, sexo: SexoCurva) {
    if (!marca) return null;
    const puntos = await this.prisma.curvaObjetivo.findMany({
      where: {
        marca: { equals: marca, mode: 'insensitive' },
        sexo: { equals: sexo, mode: 'insensitive' },
        peso_esperado_g: { not: null },
      },
      orderBy: { dia: 'asc' },
      select: { dia: true, peso_esperado_g: true },
    });
    if (puntos.length === 0) return null;
    return {
      marca,
      puntos: puntos.map((p) => ({ dia: p.dia, peso: p.peso_esperado_g! })),
    };
  }

  private esRespuestaValida(
    valor: unknown,
    diaFinal: number,
  ): valor is RespuestaCurvaMl {
    if (typeof valor !== 'object' || valor === null) return false;
    const r = valor as Partial<RespuestaCurvaMl>;
    return (
      Array.isArray(r.serie) &&
      r.serie.length === diaFinal &&
      r.serie.every((p) =>
        [p.dia, p.peso_g, p.min_g, p.max_g].every((n) => Number.isFinite(n)),
      ) &&
      Number.isFinite(r.peso_final_g) &&
      typeof r.modelo === 'object' &&
      r.modelo !== null
    );
  }
}
