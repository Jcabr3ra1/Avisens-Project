import { Module } from '@nestjs/common';
import { AlertasCanalesController } from './alertas-canales.controller';
import { AlertasCanalesService } from './alertas-canales.service';

@Module({
  controllers: [AlertasCanalesController],
  providers: [AlertasCanalesService],
  exports: [AlertasCanalesService],
})
export class AlertasCanalesModule {}
