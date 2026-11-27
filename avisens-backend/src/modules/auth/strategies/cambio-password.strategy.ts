import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';

interface CambioPasswordPayload {
  sub: number;
  tipo: 'cambio_password';
}

@Injectable()
export class CambioPasswordStrategy extends PassportStrategy(
  Strategy,
  'jwt-cambio-password',
) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow('JWT_SECRET'),
    });
  }

  async validate(payload: CambioPasswordPayload) {
    if (payload.tipo !== 'cambio_password') throw new UnauthorizedException();

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.sub, activo: true },
      include: { seguridad_cuenta: true },
    });
    const seguridad = usuario?.seguridad_cuenta;
    if (
      !usuario ||
      !seguridad?.debe_cambiar_password ||
      !seguridad.password_temporal_expira_en ||
      seguridad.password_temporal_expira_en <= new Date()
    ) {
      throw new UnauthorizedException('Token de cambio inválido o expirado');
    }
    return { id: usuario.id };
  }
}
