import { Module } from '@nestjs/common';
import { EventosSanitariosController } from './eventos-sanitarios.controller';
import { EventosSanitariosService } from './eventos-sanitarios.service';

@Module({
  controllers: [EventosSanitariosController],
  providers: [EventosSanitariosService],
})
export class EventosSanitariosModule {}
