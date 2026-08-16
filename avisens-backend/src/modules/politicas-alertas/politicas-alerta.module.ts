import { Module } from '@nestjs/common';
import { PoliticasAlertaController } from './politicas-alerta.controller';
import { PoliticasAlertaService } from './politicas-alerta.service';

@Module({
  controllers: [PoliticasAlertaController],
  providers: [PoliticasAlertaService],
})
export class PoliticasAlertaModule {}
