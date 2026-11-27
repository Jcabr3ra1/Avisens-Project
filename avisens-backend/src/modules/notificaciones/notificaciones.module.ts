import { Module } from '@nestjs/common';
import { NotificacionesController } from './notificaciones.controller';
import { NotificacionesService } from './notificaciones.service';
import { PushService } from './push.service';

@Module({
  controllers: [NotificacionesController],
  providers: [NotificacionesService, PushService],
  exports: [NotificacionesService, PushService],
})
export class NotificacionesModule {}
