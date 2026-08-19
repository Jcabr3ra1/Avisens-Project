import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { verificarDueno, Solicitante } from '../../common/acceso';

const ML_URL = process.env.ML_URL ?? 'http://ml:8000';

@Injectable()
export class PrediccionesService {
  constructor(private prisma: PrismaService) {}

  async predecir(loteId: number, solicitante: Solicitante) {
    const lote = await this.prisma.lote.findUnique({
      where: { id: loteId },
      select: {
        fecha_ingreso: true,
        cantidad_inicial: true,
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

    const respuesta = await fetch(`${ML_URL}/predecir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pesajes: pesajesParaMl }),
    });

    if (!respuesta.ok) {
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

    return {
      lote_id: loteId,
      pesajes_usados: pesajesParaMl.length,
      ...prediccion,
      mortalidad_proyectada_pct: mortalidad?.mortalidad_proyectada_pct ?? null,
    };
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

    const respuesta = await fetch(`${ML_URL}/predecir-mortalidad`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mortalidades: mortalidadesParaMl }),
    });
    if (!respuesta.ok) return null;

    return (await respuesta.json()) as {
      mortalidad_proyectada_pct: number;
      dia_faena: number;
    };
  }
}
