import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { RecuperacionesPasswordController } from './recuperaciones-password.controller';
import { RecuperacionesPasswordService } from './recuperaciones-password.service';

@Module({
  imports: [PassportModule, NotificacionesModule],
  controllers: [RecuperacionesPasswordController],
  providers: [RecuperacionesPasswordService],
})
export class RecuperacionesPasswordModule {}
