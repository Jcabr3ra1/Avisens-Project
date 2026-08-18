// alertas-canales.module.ts
import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AlertasCanalesController } from './alertas-canales.controller';
import { AlertasCanalesService } from './alertas-canales.service';

@Module({
  controllers: [AlertasCanalesController],
  providers: [AlertasCanalesService, PrismaService],
  exports: [AlertasCanalesService],
})
export class AlertasCanalesModule {}
