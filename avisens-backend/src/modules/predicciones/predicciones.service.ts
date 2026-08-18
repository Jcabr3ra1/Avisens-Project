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

    return {
      lote_id: loteId,
      pesajes_usados: pesajesParaMl.length,
      ...prediccion,
    };
  }
}
