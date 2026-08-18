import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { IndicadoresService } from './indicadores.service';

@Injectable()
export class IndicadoresJob {
  private readonly logger = new Logger(IndicadoresJob.name);

  constructor(
    private prisma: PrismaService,
    private indicadores: IndicadoresService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async calcularDiar() {
    const lotes = await this.prisma.lote.findMany({
      where: { estado: 'activo' },
      select: { id: true },
    });

    this.logger.log(`Procesando ${lotes.length} lotes activos`);
    for (const lote of lotes) {
      await this.indicadores.calcularParaLote(lote.id);
      await this.indicadores.generarAlertaDesvio(lote.id);
    }
    this.logger.log('Indicadores y alertas de desvio procesados');
  }
}
