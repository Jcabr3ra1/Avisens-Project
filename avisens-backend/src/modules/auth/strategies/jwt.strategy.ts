import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';

export interface JwtPayload {
  sub: number;
  email: string;
  rol: string;
  organizacion_id?: number | null;
  tipo?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.tipo === 'cambio_password') {
      throw new UnauthorizedException();
    }
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.sub, activo: true },
      include: { rol: true, organizacion: true },
    });
    if (!usuario || usuario.organizacion?.activa === false) {
      throw new UnauthorizedException();
    }
    return {
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol.nombre,
      organizacion_id: usuario.organizacion_id,
    };
  }
}
