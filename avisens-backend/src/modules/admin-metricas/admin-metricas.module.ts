import { Module } from '@nestjs/common';
import { AdminMetricasController } from './admin-metricas.controller';
import { AdminMetricasService } from './admin-metricas.service';

@Module({
  controllers: [AdminMetricasController],
  providers: [AdminMetricasService],
})
export class AdminMetricasModule {}
