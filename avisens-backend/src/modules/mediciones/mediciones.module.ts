import { Module } from '@nestjs/common';
import { MedicionesController } from './mediciones.controller';
import { MedicionesService } from './mediciones.service';

@Module({
  controllers: [MedicionesController],
  providers: [MedicionesService],
})
export class MedicionesModule {}
