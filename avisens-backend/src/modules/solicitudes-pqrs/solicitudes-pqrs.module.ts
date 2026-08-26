import { Module } from '@nestjs/common';
import { SolicitudesPqrsController } from './solicitudes-pqrs.controller';
import { SolicitudesPqrsService } from './solicitudes-pqrs.service';

@Module({
  controllers: [SolicitudesPqrsController],
  providers: [SolicitudesPqrsService],
  exports: [SolicitudesPqrsService],
})
export class SolicitudesPqrsModule {}
