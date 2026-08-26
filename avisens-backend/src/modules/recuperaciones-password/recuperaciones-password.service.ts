import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoRecuperacionPassword } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';

const RESPUESTA_SOLICITUD = {
  mensaje:
    'Si la cuenta existe, la solicitud será revisada por un administrador.',
};

@Injectable()
export class RecuperacionesPasswordService {
  constructor(private prisma: PrismaService) {}

  async solicitar(email: string, motivo?: string, ip?: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true, activo: true },
    });
    if (!usuario?.activo) return RESPUESTA_SOLICITUD;

    const pendiente = await this.prisma.recuperacionPassword.findFirst({
      where: {
        usuario_id: usuario.id,
        estado: EstadoRecuperacionPassword.pendiente,
      },
      select: { id: true },
    });
    if (pendiente) return RESPUESTA_SOLICITUD;

    try {
      await this.prisma.recuperacionPassword.create({
        data: {
          usuario_id: usuario.id,
          motivo: motivo?.trim() || undefined,
          ip_solicitud: ip,
        },
      });
    } catch (error) {
      if (
        !(error instanceof Error && 'code' in error && error.code === 'P2002')
      ) {
        throw error;
      }
    }
    return RESPUESTA_SOLICITUD;
  }

  async listar({ page, limit }: PaginationQueryDto) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.recuperacionPassword.findMany({
        select: {
          id: true,
          estado: true,
          motivo: true,
          fecha_creacion: true,
          atendida_en: true,
          observacion: true,
          usuario: {
            select: {
              id: true,
              nombre_completo: true,
              email: true,
              cedula: true,
              activo: true,
            },
          },
          atendida_por: {
            select: { id: true, nombre_completo: true },
          },
        },
        orderBy: { fecha_creacion: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.recuperacionPassword.count(),
    ]);
    return paginate(data, total, page, limit);
  }

  async aprobar(id: number, administradorId: number, observacion?: string) {
    const solicitud = await this.prisma.recuperacionPassword.findUnique({
      where: { id },
      include: { usuario: { select: { id: true, activo: true } } },
    });
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada');
    if (solicitud.estado !== EstadoRecuperacionPassword.pendiente) {
      throw new BadRequestException('La solicitud ya fue atendida');
    }
    if (!solicitud.usuario.activo) {
      throw new BadRequestException(
        'No se puede restablecer un usuario inactivo',
      );
    }

    const passwordTemporal = `Av-${randomBytes(9).toString('base64url')}!9`;
    const passwordHash = await bcrypt.hash(passwordTemporal, 12);
    const expiraEn = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.$transaction(async (tx) => {
      await tx.usuario.update({
        where: { id: solicitud.usuario_id },
        data: { password_hash: passwordHash },
      });
      await tx.seguridadCuenta.upsert({
        where: { usuario_id: solicitud.usuario_id },
        create: {
          usuario_id: solicitud.usuario_id,
          debe_cambiar_password: true,
          password_temporal_expira_en: expiraEn,
        },
        update: {
          intentos_fallidos: 0,
          bloqueado_hasta: null,
          debe_cambiar_password: true,
          password_temporal_expira_en: expiraEn,
        },
      });
      await tx.sesion.updateMany({
        where: { usuario_id: solicitud.usuario_id, revocada: false },
        data: { revocada: true },
      });
      await tx.recuperacionPassword.update({
        where: { id },
        data: {
          estado: EstadoRecuperacionPassword.aprobada,
          atendida_por_id: administradorId,
          atendida_en: new Date(),
          observacion: observacion?.trim() || undefined,
          expira_en: expiraEn,
        },
      });
    });

    return {
      id,
      password_temporal: passwordTemporal,
      expira_en: expiraEn,
      aviso: 'Esta contraseña se muestra una sola vez.',
    };
  }

  async rechazar(id: number, administradorId: number, observacion?: string) {
    const solicitud = await this.prisma.recuperacionPassword.findUnique({
      where: { id },
      select: { id: true, estado: true },
    });
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada');
    if (solicitud.estado !== EstadoRecuperacionPassword.pendiente) {
      throw new BadRequestException('La solicitud ya fue atendida');
    }

    return this.prisma.recuperacionPassword.update({
      where: { id },
      data: {
        estado: EstadoRecuperacionPassword.rechazada,
        atendida_por_id: administradorId,
        atendida_en: new Date(),
        observacion: observacion?.trim() || undefined,
      },
    });
  }

  async cambiarPassword(usuarioId: number, nuevaPassword: string) {
    const passwordHash = await bcrypt.hash(nuevaPassword, 12);

    await this.prisma.$transaction([
      this.prisma.usuario.update({
        where: { id: usuarioId },
        data: { password_hash: passwordHash },
      }),
      this.prisma.seguridadCuenta.update({
        where: { usuario_id: usuarioId },
        data: {
          debe_cambiar_password: false,
          password_temporal_expira_en: null,
          fecha_ultimo_cambio_password: new Date(),
        },
      }),
      this.prisma.recuperacionPassword.updateMany({
        where: {
          usuario_id: usuarioId,
          estado: EstadoRecuperacionPassword.aprobada,
          usado: false,
        },
        data: {
          estado: EstadoRecuperacionPassword.completada,
          usado: true,
        },
      }),
      this.prisma.sesion.updateMany({
        where: { usuario_id: usuarioId, revocada: false },
        data: { revocada: true },
      }),
    ]);
    return { mensaje: 'Contraseña actualizada. Inicia sesión nuevamente.' };
  }
}
