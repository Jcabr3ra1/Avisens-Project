import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { verificarDueno, Solicitante } from '../../common/acceso';

interface OpenMeteoResp {
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    wind_speed_10m?: number;
    precipitation?: number;
  };
}
@Injectable()
export class ClimaService {
  private readonly logger = new Logger(ClimaService.name);

  constructor(private prisma: PrismaService) {}

  async traerClimaDeGranja(granja: {
    id: number;
    latitud: number | null;
    longitud: number | null;
  }) {
    if (granja.latitud == null || granja.longitud == null) {
      return null;
    }

    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${granja.latitud}&longitude=${granja.longitud}` +
      `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation` +
      `&wind_speed_unit=kmh`;

    const respuesta = await fetch(url);
    if (!respuesta.ok) {
      this.logger.warn(`Clima no disponible para granja ${granja.id}`);
      return null;
    }
    const d = (await respuesta.json()) as OpenMeteoResp;
    const actual = d.current;

    return this.prisma.clima.create({
      data: {
        granja_id: granja.id,
        temperatura: actual?.temperature_2m,
        humedad: actual?.relative_humidity_2m,
        viento_kmh: actual?.wind_speed_10m ?? null,
        precipitacion: actual?.precipitation ?? null,
        fuente: 'open-meteo',
      },
    });
  }

  private async verificarGranja(granjaId: number, solicitante: Solicitante) {
    const granja = await this.prisma.granja.findUnique({
      where: { id: granjaId },
      select: { id: true, propietario_id: true },
    });
    if (!granja) throw new NotFoundException('Granja no encontrada');
    verificarDueno(
      solicitante,
      granja.propietario_id,
      'Solo puedes ver el clima de tus propias granjas',
    );
  }

  async listar(granjaId: number, solicitante: Solicitante) {
    await this.verificarGranja(granjaId, solicitante);
    return this.prisma.clima.findMany({
      where: { granja_id: granjaId },
      orderBy: { fecha_hora: 'desc' },
      take: 48,
    });
  }
  async traerAhora(granjaId: number, solicitante: Solicitante) {
    const granja = await this.prisma.granja.findUnique({
      where: { id: granjaId },
      select: {
        id: true,
        propietario_id: true,
        latitud: true,
        longitud: true,
      },
    });
    if (!granja) throw new NotFoundException('Granja no encontrada');

    verificarDueno(
      solicitante,
      granja.propietario_id,
      'Solo puedes traer el clima de tus propias granjas',
    );

    const lectura = await this.traerClimaDeGranja(granja);
    if (!lectura) {
      throw new BadRequestException(
        'No se pudo traer el clima (revisa OPENWEATHER_KEY y las coordenadas de la granja)',
      );
    }
    return lectura;
  }
}
