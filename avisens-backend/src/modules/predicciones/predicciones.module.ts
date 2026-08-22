import { Module } from '@nestjs/common';
import { PrediccionesController } from './predicciones.controller';
import { PrediccionesService } from './predicciones.service';

@Module({
  controllers: [PrediccionesController],
  providers: [PrediccionesService],
  exports: [PrediccionesService],
})
export class PrediccionesModule {}
