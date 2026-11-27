import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { ClimaService } from './clima.service';
import { JobCoordinatorService } from '../../common/jobs/job-coordinator.service';

@Injectable()
export class ClimaJob {
  private readonly logger = new Logger(ClimaJob.name);

  constructor(
    private prisma: PrismaService,
    private clima: ClimaService,
    private jobs: JobCoordinatorService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async traerClimaHorario() {
    const ahora = new Date();
    const ventana = ahora.toISOString().slice(0, 13);
    await this.jobs.ejecutar(
      'clima-horario',
      ventana,
      async () => {
        const granjas = await this.prisma.granja.findMany({
          where: {
            activa: true,
            organizacion: { activa: true },
            latitud: { not: null },
            longitud: { not: null },
          },
          select: { id: true, latitud: true, longitud: true },
        });
        this.logger.log(`Trayendo clima de ${granjas.length} granjas`);
        let fallidas = 0;
        for (const granja of granjas) {
          try {
            await this.clima.traerClimaDeGranja(granja);
          } catch (error: unknown) {
            fallidas += 1;
            const mensaje =
              error instanceof Error ? error.message : String(error);
            this.logger.error(
              `No se pudo actualizar clima de granja ${granja.id}: ${mensaje}`,
            );
          }
        }
        if (fallidas > 0) {
          throw new Error(`${fallidas} de ${granjas.length} granjas fallaron`);
        }
      },
      55 * 60 * 1000,
    );
  }
}
