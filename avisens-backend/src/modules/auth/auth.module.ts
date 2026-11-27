import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { CambioPasswordStrategy } from './strategies/cambio-password.strategy';

@Module({
  imports: [PassportModule, JwtModule.register({}), NotificacionesModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtRefreshStrategy,
    CambioPasswordStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}
