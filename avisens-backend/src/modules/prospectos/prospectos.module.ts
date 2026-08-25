import { Module } from '@nestjs/common';
import { ProspectosController } from './prospectos.controller';
import { ProspectosService } from './prospectos.service';

@Module({
  controllers: [ProspectosController],
  providers: [ProspectosService],
})
export class ProspectosModule {}
