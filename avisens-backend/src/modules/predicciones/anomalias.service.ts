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
import { diaDeVida, diaDeVidaDeFecha } from '../../common/fechas/dias-de-vida';
import { PESO_MAXIMO_POLLO_G } from '../../common/avicultura/vocabulario';
import { ClienteMlService } from './cliente-ml.service';
import { CurvaCrecimientoService } from './curva-crecimiento.service';

const OBSERVACIONES_MAXIMAS = 100;
const SEVERIDADES = ['alta', 'media', 'baja'] as const;

export interface AnomaliaLote {
  tipo: string;
  severidad: (typeof SEVERIDADES)[number];
  dia: number;
  mensaje: string;
  valor?: number;
}

interface RespuestaAnomaliasMl {
  anomalias: AnomaliaLote[];
  resumen: { total: number; severidad_maxima: string };
  modelo: { nombre: string; version: string };
}

@Injectable()
export class AnomaliasService {
  constructor(
    private prisma: PrismaService,
    private clienteMl: ClienteMlService,
    private curvaCrecimiento: CurvaCrecimientoService,
  ) {}

  async calcular(loteId: number, solicitante: Solicitante) {
    const lote = await this.prisma.lote.findUnique({
      where: { id: loteId },
      select: {
        codigo: true,
        fecha_ingreso: true,
        cantidad_inicial: true,
        sexo: true,
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
    const [pesajes, consumos, mortalidades, genetica] = await Promise.all([
      this.curvaCrecimiento.pesajesPorDia(loteId, lote.fecha_ingreso),
      this.consumosAcumulados(loteId, lote.fecha_ingreso),
      this.mortalidadesAcumuladas(
        loteId,
        lote.fecha_ingreso,
        lote.cantidad_inicial,
      ),
      this.curvaCrecimiento.curvaGenetica(lote.linea_genetica_id, sexo),
    ]);

    if (pesajes.length + consumos.length + mortalidades.length === 0) {
      throw new UnprocessableEntityException({
        codigo: 'sin_registros',
        message:
          'El lote aún no tiene pesajes, consumos ni mortalidad para revisar',
      });
    }

    const pesajesPlausibles = pesajes.filter(
      (p) => p.peso <= PESO_MAXIMO_POLLO_G,
    );
    const respuesta = await this.clienteMl.llamar('/anomalias', {
      pesajes: pesajesPlausibles.slice(-OBSERVACIONES_MAXIMAS),
      consumos: consumos.slice(-OBSERVACIONES_MAXIMAS),
      mortalidades: mortalidades.slice(-OBSERVACIONES_MAXIMAS),
      curva_referencia: (genetica?.puntos ?? []).slice(
        0,
        OBSERVACIONES_MAXIMAS,
      ),
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
    if (!this.esRespuestaValida(cuerpo)) {
      throw new BadRequestException(
        'El servicio de predicción devolvió una respuesta inválida',
      );
    }

    return {
      lote_id: loteId,
      codigo: lote.codigo,
      dia_actual: diaDeVida(lote.fecha_ingreso),
      anomalias: cuerpo.anomalias,
      resumen: cuerpo.resumen,
      modelo: cuerpo.modelo,
    };
  }

  private async consumosAcumulados(loteId: number, fechaIngreso: Date) {
    const registros = await this.prisma.consumoDiario.findMany({
      where: { lote_id: loteId },
      orderBy: { fecha: 'asc' },
      select: { fecha: true, alimento_kg: true },
    });
    let acumulado = 0;
    const porDia = new Map<number, number>();
    for (const r of registros) {
      const dia = diaDeVidaDeFecha(fechaIngreso, r.fecha);
      if (dia < 1) continue;
      acumulado += r.alimento_kg ?? 0;
      porDia.set(dia, acumulado);
    }
    return [...porDia.entries()].map(([dia, consumo_acum_kg]) => ({
      dia,
      consumo_acum_kg,
    }));
  }

  private async mortalidadesAcumuladas(
    loteId: number,
    fechaIngreso: Date,
    cantidadInicial: number,
  ) {
    if (cantidadInicial <= 0) return [];
    const registros = await this.prisma.registroMortalidad.findMany({
      where: { lote_id: loteId },
      orderBy: { fecha: 'asc' },
      select: { fecha: true, cantidad_aves: true },
    });
    let acumulado = 0;
    const porDia = new Map<number, number>();
    for (const r of registros) {
      const dia = diaDeVidaDeFecha(fechaIngreso, r.fecha);
      if (dia < 1) continue;
      acumulado += r.cantidad_aves ?? 0;
      porDia.set(dia, Math.min(100, (acumulado / cantidadInicial) * 100));
    }
    return [...porDia.entries()].map(([dia, mortalidad_pct]) => ({
      dia,
      mortalidad_pct,
    }));
  }

  private esRespuestaValida(valor: unknown): valor is RespuestaAnomaliasMl {
    if (typeof valor !== 'object' || valor === null) return false;
    const r = valor as Partial<RespuestaAnomaliasMl>;
    return (
      Array.isArray(r.anomalias) &&
      r.anomalias.every(
        (a) =>
          typeof a.tipo === 'string' &&
          typeof a.mensaje === 'string' &&
          Number.isFinite(a.dia) &&
          (SEVERIDADES as readonly string[]).includes(a.severidad),
      ) &&
      typeof r.resumen?.total === 'number' &&
      typeof r.resumen.severidad_maxima === 'string' &&
      typeof r.modelo?.version === 'string'
    );
  }
}
