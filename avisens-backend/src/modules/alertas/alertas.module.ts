// alertas.module.ts
import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AlertasController } from './alertas.controller';
import { AlertasService } from './alertas.service';

@Module({
  controllers: [AlertasController],
  providers: [AlertasService, PrismaService],
  exports: [AlertasService],
})
export class AlertasModule {}