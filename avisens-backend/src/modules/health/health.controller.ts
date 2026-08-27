import {
  Controller,
  Get,
  ServiceUnavailableException,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { COLA_WHATSAPP } from '../whatsapp/whatsapp.tipos';

@ApiTags('health')
@SkipThrottle()
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private prisma: PrismaService,
    @InjectQueue(COLA_WHATSAPP) private whatsappQueue: Queue,
  ) {}

  @Get('live')
  @ApiOperation({ summary: 'Liveness: confirma que el proceso está vivo' })
  live() {
    return {
      status: 'ok',
      uptime_seconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness: comprueba PostgreSQL y Redis' })
  ready() {
    return this.check();
  }

  @Get()
  @ApiOperation({ summary: 'Estado del servicio y de la base de datos' })
  async check() {
    const [db, redis] = await Promise.allSettled([
      this.prisma.$queryRaw`SELECT 1`,
      this.pingRedis(),
    ]);

    const dependencias = {
      db: db.status === 'fulfilled' ? 'up' : 'down',
      redis: redis.status === 'fulfilled' ? 'up' : 'down',
    };
    if (db.status === 'rejected' || redis.status === 'rejected') {
      throw new ServiceUnavailableException({
        status: 'error',
        ...dependencias,
        timestamp: new Date().toISOString(),
      });
    }

    return {
      status: 'ok',
      ...dependencias,
      uptime_seconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  private async pingRedis() {
    let temporizador: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        this.whatsappQueue.waitUntilReady(),
        new Promise<never>((_, reject) => {
          temporizador = setTimeout(
            () => reject(new Error('Redis no respondió en 2 segundos')),
            2000,
          );
        }),
      ]);
    } finally {
      if (temporizador) clearTimeout(temporizador);
    }
  }
}
