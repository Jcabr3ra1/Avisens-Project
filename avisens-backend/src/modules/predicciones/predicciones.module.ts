import { Module } from '@nestjs/common';
import { PrediccionesController } from './predicciones.controller';
import { PrediccionesService } from './predicciones.service';

@Module({
  controllers: [PrediccionesController],
  providers: [PrediccionesService],
})
export class PrediccionesModule {}
