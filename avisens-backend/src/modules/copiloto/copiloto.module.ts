import { Module } from '@nestjs/common';
import { LotesModule } from '../lotes/lotes.module';
import { IndicadoresModule } from '../indicadores/indicadores.module';
import { PrediccionesModule } from '../predicciones/predicciones.module';
import { RecomendacionesModule } from '../recomendaciones/recomendaciones.module';
import { CopilotoController } from './copiloto.controller';
import { CopilotoService } from './copiloto.service';

@Module({
  imports: [
    LotesModule,
    IndicadoresModule,
    PrediccionesModule,
    RecomendacionesModule,
  ],
  controllers: [CopilotoController],
  providers: [CopilotoService],
})
export class CopilotoModule {}
