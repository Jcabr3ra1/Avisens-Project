import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { JwtPayload } from './jwt.strategy';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface RefreshJwtPayload extends JwtPayload {
  jti?: string;
  session_id?: string;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refresh_token'),
      secretOrKey: config.getOrThrow('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: RefreshJwtPayload) {
    // La firma ya se verificó en este punto (passport-jwt la comprueba
    // antes de llamar a validate()), pero eso NO garantiza que el
    // payload traiga los campos que el contrato actual exige -- un
    // token firmado antes de este cambio tiene firma válida (el secreto
    // no cambió) pero no lleva session_id ni este jti. Se valida
    // explícitamente, ANTES de que el controller o el servicio hagan
    // cualquier consulta: un session_id `undefined` en un `where` de
    // Prisma no filtra "ningún registro" -- Prisma omite ese campo del
    // filtro por completo, lo que ampliaría un logout a todas las
    // sesiones del usuario en vez de rechazarlo.
    if (typeof payload.sub !== 'number' || !Number.isInteger(payload.sub) || payload.sub <= 0) {
      throw new UnauthorizedException('Refresh token inválido');
    }
    if (typeof payload.jti !== 'string' || payload.jti.length === 0) {
      throw new UnauthorizedException('Refresh token inválido');
    }
    if (typeof payload.session_id !== 'string' || !UUID_RE.test(payload.session_id)) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    const refresh_token = (req.body as { refresh_token: string }).refresh_token;
    return { ...payload, refresh_token };
  }
}
