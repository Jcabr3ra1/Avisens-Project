import { Module } from '@nestjs/common';
import { ConsumosDiariosController } from './consumos-diarios.controller';
import { ConsumosDiariosService } from './consumos-diarios.service';

@Module({
  controllers: [ConsumosDiariosController],
  providers: [ConsumosDiariosService],
})
export class ConsumosDiariosModule {}
