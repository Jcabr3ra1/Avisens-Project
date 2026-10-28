import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Solicitante } from '../../common/auth/acceso';
import { verificarAccesoGalpon } from '../../common/auth/alcance';
import { diaDeVida } from '../../common/fechas/dias-de-vida';
import { ClienteMlService } from './cliente-ml.service';
import {
  HoraPronostico,
  PronosticoClimaService,
} from './pronostico-clima.service';

const VENTANA_LECTURA_MS = 60 * 60 * 1000;

interface RespuestaRiesgoMl {
  serie: unknown[];
  pico: { hora: string; thi: number; nivel: string };
  nivel_maximo: string;
  horas_por_nivel: Record<string, number>;
  primera_alerta: string | null;
  recomendaciones: string[];
  modelo: { nombre: string; version: string };
}

@Injectable()
export class RiesgoCalorService {
  constructor(
    private prisma: PrismaService,
    private clienteMl: ClienteMlService,
    private pronostico: PronosticoClimaService,
  ) {}

  async calcular(galponId: number, solicitante: Solicitante) {
    const galpon = await this.prisma.galpon.findUnique({
      where: { id: galponId },
      select: {
        nombre: true,
        granja: {
          select: {
            propietario_id: true,
            latitud: true,
            longitud: true,
            municipio: true,
            departamento: true,
          },
        },
      },
    });
    if (!galpon) throw new NotFoundException('Galpón no encontrado');
    await verificarAccesoGalpon(
      this.prisma,
      galponId,
      solicitante,
      'Solo puedes consultar tus propios galpones',
      galpon.granja.propietario_id,
    );

    const coordenadas = await this.pronostico.coordenadas(galpon.granja);
    if (!coordenadas) {
      throw new UnprocessableEntityException({
        message:
          'Completa el municipio de la granja para traer el pronóstico del clima',
        codigo: 'sin_ubicacion',
      });
    }
    const horas = await this.pronostico.proximasHoras(
      coordenadas.latitud,
      coordenadas.longitud,
    );
    if (!horas) {
      throw new BadRequestException('El pronóstico del clima no respondió');
    }

    const [lote, interior] = await Promise.all([
      this.prisma.lote.findFirst({
        where: { galpon_id: galponId, estado: 'activo' },
        select: { codigo: true, fecha_ingreso: true },
      }),
      this.lecturaInterior(galponId),
    ]);
    const ajuste = this.ajusteInterior(interior, horas[0]);
    const diaVida = lote ? diaDeVida(lote.fecha_ingreso) : null;

    const respuesta = await this.clienteMl.llamar('/riesgo-calor', {
      horas,
      ajuste_temperatura: ajuste.temperatura,
      ajuste_humedad: ajuste.humedad,
      dia_vida: diaVida,
    });
    if (!respuesta) {
      throw new BadRequestException('El servicio de predicción no respondió');
    }
    if (!respuesta.ok) {
      throw new BadRequestException(
        'El servicio de predicción rechazó los datos del galpón',
      );
    }
    const cuerpo = await this.clienteMl.leerJson(respuesta);
    if (!this.esRespuestaValida(cuerpo)) {
      throw new BadRequestException(
        'El servicio de predicción devolvió una respuesta inválida',
      );
    }

    return {
      galpon_id: galponId,
      galpon: galpon.nombre,
      lote: lote ? { codigo: lote.codigo, dia_vida: diaVida } : null,
      ubicacion: coordenadas,
      interior,
      ...cuerpo,
    };
  }

  private async lecturaInterior(galponId: number) {
    const desde = new Date(Date.now() - VENTANA_LECTURA_MS);
    const promedio = (tipo: string) =>
      this.prisma.medicion.aggregate({
        _avg: { valor: true },
        where: {
          sensor: { galpon_id: galponId, tipo },
          fecha_hora: { gte: desde },
          calidad: 'ok',
        },
      });
    const [temperatura, humedad] = await Promise.all([
      promedio('temperatura'),
      promedio('humedad'),
    ]);
    return {
      temperatura: temperatura._avg.valor,
      humedad: humedad._avg.valor,
    };
  }

  private ajusteInterior(
    interior: { temperatura: number | null; humedad: number | null },
    exterior: HoraPronostico,
  ) {
    const redondear = (valor: number) => Math.round(valor * 10) / 10;
    return {
      temperatura:
        interior.temperatura === null
          ? 0
          : redondear(interior.temperatura - exterior.temperatura),
      humedad:
        interior.humedad === null
          ? 0
          : redondear(interior.humedad - exterior.humedad),
    };
  }

  private esRespuestaValida(cuerpo: unknown): cuerpo is RespuestaRiesgoMl {
    if (!cuerpo || typeof cuerpo !== 'object') return false;
    const r = cuerpo as Partial<RespuestaRiesgoMl>;
    return (
      Array.isArray(r.serie) &&
      r.serie.length > 0 &&
      typeof r.pico?.thi === 'number' &&
      typeof r.nivel_maximo === 'string' &&
      typeof r.modelo?.version === 'string'
    );
  }
}
