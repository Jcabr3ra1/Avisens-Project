import { Module } from '@nestjs/common';
import { OrdenesActuadoresController } from './ordenes-actuadores.controller';
import { OrdenesActuadoresService } from './ordenes-actuadores.service';

@Module({
  controllers: [OrdenesActuadoresController],
  providers: [OrdenesActuadoresService],
  // IngestService entrega las órdenes al ESP32 y recibe sus confirmaciones.
  exports: [OrdenesActuadoresService],
})
export class OrdenesActuadoresModule {}
