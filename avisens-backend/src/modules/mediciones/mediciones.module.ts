import { Module } from '@nestjs/common';
import { MedicionesController } from './mediciones.controller';
import { MedicionesService } from './mediciones.service';
import { AlertasModule } from '../alertas/alertas.module';

@Module({
  controllers: [MedicionesController],
  imports: [AlertasModule],
  providers: [MedicionesService],
})
export class MedicionesModule {}
