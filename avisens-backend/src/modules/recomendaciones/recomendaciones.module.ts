import { Module } from '@nestjs/common';
import { IndicadoresModule } from '../indicadores/indicadores.module';
import { RecomendacionesController } from './recomendaciones.controller';
import { RecomendacionesService } from './recomendaciones.service';

@Module({
  imports: [IndicadoresModule],
  controllers: [RecomendacionesController],
  providers: [RecomendacionesService],
  exports: [RecomendacionesService],
})
export class RecomendacionesModule {}
