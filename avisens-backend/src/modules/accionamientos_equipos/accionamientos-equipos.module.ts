// accionamientos-equipos.module.ts
import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AccionamientosEquiposController } from './accionamientos-equipos.controller';
import {AccionamientosEquiposService} from './accionamiento-equipo.service'
@Module({
  controllers: [AccionamientosEquiposController],
  providers: [AccionamientosEquiposService, PrismaService],
  exports: [AccionamientosEquiposService],
})
export class AccionamientosEquiposModule {}