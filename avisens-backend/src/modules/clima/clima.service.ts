import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { verificarDueno, Solicitante } from '../../common/acceso';

interface OpenWeatherResp {
  main?: { temp?: number; humidity?: number };
  wind?: { speed?: number };
  rain?: { '1h'?: number };
}
@Injectable()
export class ClimaService {
  private readonly logger = new Logger(ClimaService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async traerClimaDeGranja(granja: {
    id: number;
    latitud: number | null;
    longitud: number | null;
  }) {
    const apiKey = this.config.get<string>('OPENWEATHER_KEY');
    if (!apiKey || granja.latitud == null || granja.longitud == null) {
      return null;
    }

    const url =
      `https://api.openweathermap.org/data/2.5/weather` +
      `?lat=${granja.latitud}&lon=${granja.longitud}` +
      `&appid=${apiKey}&units=metric`;

    const respuesta = await fetch(url);
    if (!respuesta.ok) {
      this.logger.warn(`Clima no disponible para granja ${granja.id}`);
      return null;
    }
    const d = (await respuesta.json()) as OpenWeatherResp;

    return this.prisma.clima.create({
      data: {
        granja_id: granja.id,
        temperatura: d.main?.temp,
        humedad: d.main?.humidity,
        viento_kmh: d.wind?.speed != null ? d.wind.speed * 3.6 : null,
        precipitacion: d.rain?.['1h'] ?? null,
        fuente: 'openweather',
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
}
