import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { hashDeviceToken } from '../security/device-token';

export interface DispositivoAutenticado {
  id: number;
  galpon_id: number;
  codigo_topic: string;
}

export interface DeviceRequest extends Request {
  dispositivo: DispositivoAutenticado;
}

@Injectable()
export class DeviceTokenGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<DeviceRequest>();
    const token = req.headers['x-device-token'];

    if (typeof token !== 'string' || token.length === 0) {
      throw new UnauthorizedException('Falta el token del dispositivo');
    }

    const tokenHash = hashDeviceToken(token);
    const dispositivo = await this.prisma.dispositivo.findFirst({
      where: {
        OR: [{ token_ingesta_hash: tokenHash }, { token_ingesta: token }],
      },
      select: {
        id: true,
        galpon_id: true,
        codigo_topic: true,
        activo: true,
        token_ingesta: true,
        token_ingesta_hash: true,
        galpon: {
          select: {
            activo: true,
            granja: {
              select: {
                activa: true,
                organizacion: { select: { activa: true } },
              },
            },
          },
        },
      },
    });

    if (
      !dispositivo ||
      !dispositivo.activo ||
      !dispositivo.galpon.activo ||
      !dispositivo.galpon.granja.activa ||
      !dispositivo.galpon.granja.organizacion.activa
    ) {
      throw new UnauthorizedException('Token de dispositivo inválido');
    }

    // Migración progresiva: el secreto que ya posee el ESP32 no cambia, pero
    // deja de permanecer en texto plano en la base después de su primer uso.
    if (dispositivo.token_ingesta === token) {
      await this.prisma.dispositivo.update({
        where: { id: dispositivo.id },
        data: { token_ingesta: null, token_ingesta_hash: tokenHash },
      });
    }

    req.dispositivo = {
      id: dispositivo.id,
      galpon_id: dispositivo.galpon_id,
      codigo_topic: dispositivo.codigo_topic,
    };
    return true;
  }
}
