import { Module } from '@nestjs/common';
import { ComandosVozController } from './comandos-voz.controller';
import { ComandosVozService } from './comandos-voz.service';

@Module({
  controllers: [ComandosVozController],
  providers: [ComandosVozService],
})
export class ComandosVozModule {}
