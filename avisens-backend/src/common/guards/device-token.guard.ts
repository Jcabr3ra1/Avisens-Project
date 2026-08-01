import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

// Datos del dispositivo autenticado que el guard adjunta a la petición para que
// el controlador/servicio sepan quién reporta (sin volver a consultar la BD).
export interface DispositivoAutenticado {
  id: number;
  galpon_id: number;
  codigo_topic: string;
}

export interface DeviceRequest extends Request {
  dispositivo: DispositivoAutenticado;
}

// Autentica al ESP32 por su token (header X-Device-Token) en vez de un JWT
// humano: un dispositivo no puede iniciar sesión con correo/contraseña. El
// token vive en dispositivos.token_ingesta (único). Rechaza si falta el header,
// el token no existe, o el dispositivo está inactivo.
@Injectable()
export class DeviceTokenGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<DeviceRequest>();
    const token = req.headers['x-device-token'];

    if (typeof token !== 'string' || token.length === 0) {
      throw new UnauthorizedException('Falta el token del dispositivo');
    }

    const dispositivo = await this.prisma.dispositivo.findUnique({
      where: { token_ingesta: token },
      select: { id: true, galpon_id: true, codigo_topic: true, activo: true },
    });

    if (!dispositivo || !dispositivo.activo) {
      throw new UnauthorizedException('Token de dispositivo inválido');
    }

    req.dispositivo = {
      id: dispositivo.id,
      galpon_id: dispositivo.galpon_id,
      codigo_topic: dispositivo.codigo_topic,
    };
    return true;
  }
}
