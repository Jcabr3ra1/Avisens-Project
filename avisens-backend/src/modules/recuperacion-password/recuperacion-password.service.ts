import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { SolicitarRecuperacionDto } from './dto/solicitar-recuperacion.dto';
import { RestablecerPasswordDto } from './dto/restablecer-password.dto';

const EXPIRACION_MINUTOS = 30;
const MENSAJE_GENERICO =
  'Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña';

@Injectable()
export class RecuperacionPasswordService {
  private readonly logger = new Logger(RecuperacionPasswordService.name);

  constructor(private prisma: PrismaService) {}

  async solicitar(dto: SolicitarRecuperacionDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });

    if (!usuario || !usuario.activo) {
      return { mensaje: MENSAJE_GENERICO };
    }

    const token = randomBytes(32).toString('hex');
    const token_hash = await bcrypt.hash(token, 10);
    const expira_en = new Date(Date.now() + EXPIRACION_MINUTOS * 60 * 1000);

    await this.prisma.$transaction([
      this.prisma.recuperacionPassword.updateMany({
        where: { usuario_id: usuario.id, usado: false },
        data: { usado: true },
      }),
      this.prisma.recuperacionPassword.create({
        data: { usuario_id: usuario.id, token_hash, expira_en },
      }),
    ]);

    this.logger.warn(
      `Token de recuperación para ${usuario.email} (expira en ${EXPIRACION_MINUTOS} min): ${token}`,
    );

    return { mensaje: MENSAJE_GENERICO };
  }

  async restablecer(dto: RestablecerPasswordDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });
    if (!usuario) {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    const tokenValido = await this.buscarTokenValido(usuario.id, dto.token);
    if (!tokenValido) {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    const password_hash = await bcrypt.hash(dto.password, 12);

    await this.prisma.$transaction([
      this.prisma.usuario.update({
        where: { id: usuario.id },
        data: { password_hash },
      }),
      this.prisma.recuperacionPassword.updateMany({
        where: { usuario_id: usuario.id, usado: false },
        data: { usado: true },
      }),
      this.prisma.seguridadCuenta.upsert({
        where: { usuario_id: usuario.id },
        create: {
          usuario_id: usuario.id,
          fecha_ultimo_cambio_password: new Date(),
        },
        update: {
          intentos_fallidos: 0,
          bloqueado_hasta: null,
          fecha_ultimo_cambio_password: new Date(),
        },
      }),
      this.prisma.sesion.updateMany({
        where: { usuario_id: usuario.id, revocada: false },
        data: { revocada: true },
      }),
    ]);

    return { mensaje: 'Contraseña actualizada correctamente' };
  }

  private async buscarTokenValido(usuarioId: number, token: string) {
    const tokens = await this.prisma.recuperacionPassword.findMany({
      where: {
        usuario_id: usuarioId,
        usado: false,
        expira_en: { gt: new Date() },
      },
      orderBy: { fecha_creacion: 'desc' },
    });

    for (const registro of tokens) {
      if (await bcrypt.compare(token, registro.token_hash)) {
        return registro;
      }
    }
    return null;
  }
}
