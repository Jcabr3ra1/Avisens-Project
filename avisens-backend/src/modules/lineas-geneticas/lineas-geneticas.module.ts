import { Module } from '@nestjs/common';
import { LineasGeneticasController } from './lineas-geneticas.controller';
import { LineasGeneticasService } from './lineas-geneticas.service';

@Module({
  controllers: [LineasGeneticasController],
  providers: [LineasGeneticasService],
  exports: [LineasGeneticasService],
})
export class LineasGeneticasModule {}
