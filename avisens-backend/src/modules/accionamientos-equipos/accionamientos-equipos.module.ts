import { Module } from '@nestjs/common';
import { AccionamientosEquiposController } from './accionamientos-equipos.controller';
import {AccionamientosEquiposService} from './accionamientos-equipos.service'
@Module({
  controllers: [AccionamientosEquiposController],
  providers: [AccionamientosEquiposService],
  exports: [AccionamientosEquiposService],
})
export class AccionamientosEquiposModule {}
