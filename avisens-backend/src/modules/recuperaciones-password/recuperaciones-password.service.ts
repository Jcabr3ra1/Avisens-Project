import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoRecuperacionPassword, type Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizarUsername } from '../../common/auth/username';
import { ROLES } from '../../common/auth/roles';
import { esPropietario, type Solicitante } from '../../common/auth/acceso';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';

const RESPUESTA_SOLICITUD = {
  mensaje:
    'Si la cuenta existe, la solicitud será revisada por un administrador.',
};

@Injectable()
export class RecuperacionesPasswordService {
  constructor(private prisma: PrismaService) {}

  private selectSolicitud = {
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
        username: true,
        email: true,
        cedula: true,
        activo: true,
      },
    },
    atendida_por: {
      select: { id: true, nombre_completo: true },
    },
  };

  private filtroPorSolicitante(
    solicitante?: Solicitante,
  ): Prisma.RecuperacionPasswordWhereInput | undefined {
    if (!solicitante || !esPropietario(solicitante)) return undefined;
    if (!solicitante.organizacion_id) {
      throw new ForbiddenException(
        'Tu cuenta de propietario no tiene una organización asignada',
      );
    }
    return {
      usuario: {
        organizacion_id: solicitante.organizacion_id,
        rol: { nombre: ROLES.OPERARIO },
      },
    };
  }

  private verificarPermisoSobreUsuario(
    usuario: {
      organizacion_id?: number | null;
      rol?: { nombre: string } | null;
    },
    solicitante?: Solicitante,
  ) {
    if (!solicitante || !esPropietario(solicitante)) return;
    if (!solicitante.organizacion_id) {
      throw new ForbiddenException(
        'Tu cuenta de propietario no tiene una organización asignada',
      );
    }
    if (
      usuario.rol?.nombre !== ROLES.OPERARIO ||
      usuario.organizacion_id !== solicitante.organizacion_id
    ) {
      throw new ForbiddenException(
        'Solo puedes gestionar solicitudes de recuperación de operarios de tu organización',
      );
    }
  }

  async solicitar(username: string, motivo?: string, ip?: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { username: normalizarUsername(username) },
      select: {
        id: true,
        activo: true,
        nombre_completo: true,
        organizacion_id: true,
        rol: { select: { nombre: true } },
      },
    });
    const rolHabilitado =
      usuario?.rol.nombre === ROLES.PROPIETARIO ||
      usuario?.rol.nombre === ROLES.OPERARIO;
    if (!usuario?.activo || !rolHabilitado) {
      return RESPUESTA_SOLICITUD;
    }

    const pendiente = await this.prisma.recuperacionPassword.findFirst({
      where: {
        usuario_id: usuario.id,
        estado: EstadoRecuperacionPassword.pendiente,
      },
      select: { id: true },
    });
    if (pendiente) return RESPUESTA_SOLICITUD;

    try {
      await this.prisma.$transaction(async (tx) => {
        const solicitud = await tx.recuperacionPassword.create({
          data: {
            usuario_id: usuario.id,
            motivo: motivo?.trim() || undefined,
            ip_solicitud: ip,
          },
        });
        const condicionesDestinatario: Prisma.UsuarioWhereInput[] = [
          { rol: { nombre: ROLES.ADMINISTRADOR } },
        ];
        if (usuario.rol.nombre === ROLES.OPERARIO && usuario.organizacion_id) {
          condicionesDestinatario.push({
            rol: { nombre: ROLES.PROPIETARIO },
            organizacion_id: usuario.organizacion_id,
          });
        }
        const destinatarios = await tx.usuario.findMany({
          where: {
            activo: true,
            OR: condicionesDestinatario,
          },
          select: { id: true },
        });

        if (destinatarios.length > 0) {
          await tx.notificacion.createMany({
            data: destinatarios.map((destinatario) => ({
              usuario_id: destinatario.id,
              tipo: 'recuperacion_password',
              titulo: 'Solicitud de recuperación de contraseña',
              mensaje: `${usuario.nombre_completo} solicitó restablecer su contraseña.`,
              referencia_tipo: 'recuperacion_password',
              referencia_id: solicitud.id,
            })),
          });
        }
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

  async listar({ page, limit }: PaginationQueryDto, solicitante?: Solicitante) {
    const where = this.filtroPorSolicitante(solicitante);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.recuperacionPassword.findMany({
        where,
        select: this.selectSolicitud,
        orderBy: { fecha_creacion: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.recuperacionPassword.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  async listarDeUsuario(usuarioId: number, solicitante?: Solicitante) {
    if (solicitante && esPropietario(solicitante)) {
      const usuario = await this.prisma.usuario.findUnique({
        where: { id: usuarioId },
        select: {
          id: true,
          organizacion_id: true,
          rol: { select: { nombre: true } },
        },
      });
      if (!usuario) throw new NotFoundException('Usuario no encontrado');
      this.verificarPermisoSobreUsuario(usuario, solicitante);
    }
    return this.prisma.recuperacionPassword.findMany({
      where: { usuario_id: usuarioId },
      select: this.selectSolicitud,
      orderBy: { fecha_creacion: 'desc' },
    });
  }

  async aprobar(
    id: number,
    administradorId: number,
    observacion?: string,
    solicitante?: Solicitante,
  ) {
    const solicitud = await this.prisma.recuperacionPassword.findUnique({
      where: { id },
      include: {
        usuario: {
          select: {
            id: true,
            activo: true,
            organizacion_id: true,
            rol: { select: { nombre: true } },
          },
        },
      },
    });
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada');
    this.verificarPermisoSobreUsuario(solicitud.usuario, solicitante);
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
    const esOperario = solicitud.usuario.rol?.nombre === ROLES.OPERARIO;
    const ahora = new Date();
    const expiraEn = esOperario
      ? null
      : new Date(ahora.getTime() + 24 * 60 * 60 * 1000);

    await this.prisma.$transaction(async (tx) => {
      await tx.usuario.update({
        where: { id: solicitud.usuario_id },
        data: { password_hash: passwordHash },
      });
      await tx.seguridadCuenta.upsert({
        where: { usuario_id: solicitud.usuario_id },
        create: {
          usuario_id: solicitud.usuario_id,
          debe_cambiar_password: !esOperario,
          password_temporal_expira_en: expiraEn,
          fecha_ultimo_cambio_password: esOperario ? ahora : null,
        },
        update: {
          intentos_fallidos: 0,
          bloqueado_hasta: null,
          debe_cambiar_password: !esOperario,
          password_temporal_expira_en: expiraEn,
          ...(esOperario ? { fecha_ultimo_cambio_password: ahora } : {}),
        },
      });
      await tx.sesion.updateMany({
        where: { usuario_id: solicitud.usuario_id, revocada: false },
        data: { revocada: true },
      });
      await tx.recuperacionPassword.update({
        where: { id },
        data: {
          estado: esOperario
            ? EstadoRecuperacionPassword.completada
            : EstadoRecuperacionPassword.aprobada,
          usado: esOperario,
          atendida_por_id: administradorId,
          atendida_en: ahora,
          observacion: observacion?.trim() || undefined,
          expira_en: expiraEn,
        },
      });
    });

    return {
      id,
      password_temporal: passwordTemporal,
      expira_en: expiraEn,
      aviso: esOperario
        ? 'Esta contraseña queda activa de inmediato para el operario. Se muestra una sola vez.'
        : 'Esta contraseña se muestra una sola vez.',
    };
  }

  async rechazar(
    id: number,
    administradorId: number,
    observacion?: string,
    solicitante?: Solicitante,
  ) {
    const solicitud = await this.prisma.recuperacionPassword.findUnique({
      where: { id },
      select: {
        id: true,
        estado: true,
        usuario: {
          select: {
            organizacion_id: true,
            rol: { select: { nombre: true } },
          },
        },
      },
    });
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada');
    this.verificarPermisoSobreUsuario(solicitud.usuario, solicitante);
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
