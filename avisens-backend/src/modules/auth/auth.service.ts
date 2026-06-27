import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
      include: { rol: true, seguridad_cuenta: true },
    });

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const seguridad = usuario.seguridad_cuenta;

    if (seguridad?.bloqueado_hasta && seguridad.bloqueado_hasta > new Date()) {
      throw new ForbiddenException('Cuenta bloqueada temporalmente');
    }

    const passwordOk = await bcrypt.compare(dto.password, usuario.password_hash);

    if (!passwordOk) {
      await this.registrarIntentoFallido(usuario.id, seguridad);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    await this.resetearIntentosFallidos(usuario.id);

    const tokens = await this.generarTokens(usuario.id, usuario.email, usuario.rol.nombre);

    await this.prisma.sesion.create({
      data: {
        usuario_id: usuario.id,
        refresh_token_hash: await bcrypt.hash(tokens.refresh_token, 10),
        ip_origen: ip,
        user_agent: userAgent,
        expira_en: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre_completo,
        email: usuario.email,
        rol: usuario.rol.nombre,
      },
    };
  }

  async refresh(userId: number, email: string, refreshToken: string) {
    const sesiones = await this.prisma.sesion.findMany({
      where: { usuario_id: userId, revocada: false, expira_en: { gt: new Date() } },
    });

    const sesionValida = await Promise.any(
      sesiones.map(async (s) => {
        const match = await bcrypt.compare(refreshToken, s.refresh_token_hash);
        if (!match) throw new Error();
        return s;
      }),
    ).catch(() => null);

    if (!sesionValida) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
      include: { rol: true },
    });

    if (!usuario || !usuario.activo) throw new UnauthorizedException();

    const tokens = await this.generarTokens(usuario.id, usuario.email, usuario.rol.nombre);

    await this.prisma.sesion.update({
      where: { id: sesionValida.id },
      data: { refresh_token_hash: await bcrypt.hash(tokens.refresh_token, 10) },
    });

    return tokens;
  }

  async logout(userId: number, refreshToken: string) {
    const sesiones = await this.prisma.sesion.findMany({
      where: { usuario_id: userId, revocada: false },
    });

    for (const sesion of sesiones) {
      const match = await bcrypt.compare(refreshToken, sesion.refresh_token_hash);
      if (match) {
        await this.prisma.sesion.update({
          where: { id: sesion.id },
          data: { revocada: true },
        });
        break;
      }
    }
  }

  private async generarTokens(userId: number, email: string, rol: string) {
    const payload = { sub: userId, email, rol };

    const [access_token, refresh_token] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow('JWT_SECRET'),
        expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);

    return { access_token, refresh_token };
  }

  private async registrarIntentoFallido(
    userId: number,
    seguridad: { id: number; intentos_fallidos: number } | null,
  ) {
    const intentos = (seguridad?.intentos_fallidos ?? 0) + 1;
    const bloqueado_hasta = intentos >= 5
      ? new Date(Date.now() + 15 * 60 * 1000)
      : null;

    await this.prisma.seguridadCuenta.upsert({
      where: { usuario_id: userId },
      create: { usuario_id: userId, intentos_fallidos: intentos, bloqueado_hasta },
      update: { intentos_fallidos: intentos, bloqueado_hasta },
    });
  }

  private async resetearIntentosFallidos(userId: number) {
    await this.prisma.seguridadCuenta.upsert({
      where: { usuario_id: userId },
      create: { usuario_id: userId, intentos_fallidos: 0, fecha_ultimo_login: new Date() },
      update: { intentos_fallidos: 0, bloqueado_hasta: null, fecha_ultimo_login: new Date() },
    });
  }
}
