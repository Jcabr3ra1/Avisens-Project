import { Module } from '@nestjs/common';
import { CurvasGeneticasController } from './curvas-geneticas.controller';
import { CurvasGeneticasService } from './curvas-geneticas.service';

@Module({
  controllers: [CurvasGeneticasController],
  providers: [CurvasGeneticasService],
  exports: [CurvasGeneticasService],
})
export class CurvasGeneticasModule {}
