import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { ClimaService } from './clima.service';

@Injectable()
export class ClimaJob {
  private readonly logger = new Logger(ClimaJob.name);

  constructor(
    private prisma: PrismaService,
    private clima: ClimaService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async traerClimaHorario() {
    const granjas = await this.prisma.granja.findMany({
      where: { activa: true, latitud: { not: null }, longitud: { not: null } },
      select: { id: true, latitud: true, longitud: true },
    });
    this.logger.log(`Trayendo clima de ${granjas.length} granjas`);
    for (const granja of granjas) {
      await this.clima.traerClimaDeGranja(granja);
    }
    this.logger.log('Clima horario actualizado');
  }
}
