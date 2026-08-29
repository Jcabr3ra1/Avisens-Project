import { Module } from '@nestjs/common';
import { CaptacionProspectosController } from './captacion-prospectos.controller';
import { CaptacionProspectosService } from './captacion-prospectos.service';

@Module({
  controllers: [CaptacionProspectosController],
  providers: [CaptacionProspectosService],
})
export class CaptacionProspectosModule {}
