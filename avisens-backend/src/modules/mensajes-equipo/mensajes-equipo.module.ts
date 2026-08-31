import { Module } from '@nestjs/common';
import { MensajesEquipoController } from './mensajes-equipo.controller';
import { MensajesEquipoService } from './mensajes-equipo.service';

@Module({
  controllers: [MensajesEquipoController],
  providers: [MensajesEquipoService],
})
export class MensajesEquipoModule {}
