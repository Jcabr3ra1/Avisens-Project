import { Module } from '@nestjs/common';
import { AnalisisBioacusticoController } from './analisis-bioacustico.controller';
import { AnalisisBioacusticoService } from './analisis-bioacustico.service';

@Module({
  controllers: [AnalisisBioacusticoController],
  providers: [AnalisisBioacusticoService],
  exports: [AnalisisBioacusticoService],
})
export class AnalisisBioacusticoModule {}
