import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';
import { ROLES } from '../../common/auth/roles';
import { esPropietario } from '../../common/auth/acceso';
import type { Solicitante } from '../../common/auth/acceso';

const USUARIO_SELECT = {
  id: true,
  nombre_completo: true,
  email: true,
  cedula: true,
  telefono: true,
  activo: true,
  fecha_creacion: true,
  organizacion_id: true,
  rol: { select: { id: true, nombre: true } },
  organizacion: { select: { id: true, nombre: true } },
} as const;

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  private organizacionDelPropietario(solicitante: Solicitante): number {
    if (!solicitante.organizacion_id) {
      throw new ForbiddenException(
        'Tu cuenta de propietario no tiene una organización asignada',
      );
    }
    return solicitante.organizacion_id;
  }

  private async validarOrganizacion(id: number) {
    const organizacion = await this.prisma.organizacion.findFirst({
      where: { id, activa: true },
      select: { id: true },
    });
    if (!organizacion) {
      throw new NotFoundException('Organización no encontrada o inactiva');
    }
  }

  private verificarOperarioDeLaOrganizacion(
    usuario: { rol: { nombre: string }; organizacion_id?: number | null },
    solicitante: Solicitante,
  ) {
    if (!esPropietario(solicitante)) return;
    const organizacionId = this.organizacionDelPropietario(solicitante);
    if (
      usuario.rol.nombre !== ROLES.OPERARIO ||
      usuario.organizacion_id !== organizacionId
    ) {
      throw new ForbiddenException(
        'Solo puedes gestionar operarios de tu organización',
      );
    }
  }

  async crear(dto: CreateUsuarioDto, solicitante: Solicitante) {
    let rolId = dto.rol_id;
    let organizacionId: number | undefined;
    let nuevaOrganizacion: string | undefined;
    if (esPropietario(solicitante)) {
      const rolOperario = await this.prisma.rol.findUnique({
        where: { nombre: ROLES.OPERARIO },
      });
      if (!rolOperario)
        throw new NotFoundException('Rol Operario no encontrado');
      rolId = rolOperario.id;
      organizacionId = this.organizacionDelPropietario(solicitante);
    } else {
      const rol = await this.prisma.rol.findUnique({
        where: { id: dto.rol_id },
      });
      if (!rol) throw new NotFoundException('Rol no encontrado');

      if (dto.organizacion_id) {
        await this.validarOrganizacion(dto.organizacion_id);
        organizacionId = dto.organizacion_id;
      } else if (rol.nombre === ROLES.PROPIETARIO) {
        nuevaOrganizacion =
          dto.organizacion_nombre?.trim() ||
          `Organización de ${dto.nombre_completo}`;
      } else if (rol.nombre === ROLES.OPERARIO) {
        throw new BadRequestException(
          'El Administrador debe indicar la organización del Operario',
        );
      }
    }

    const password_hash = await bcrypt.hash(dto.password, 12);

    return this.prisma.$transaction(async (tx) => {
      if (nuevaOrganizacion) {
        const organizacion = await tx.organizacion.create({
          data: { nombre: nuevaOrganizacion },
          select: { id: true },
        });
        organizacionId = organizacion.id;
      }

      return tx.usuario.create({
        data: {
          nombre_completo: dto.nombre_completo,
          cedula: dto.cedula,
          email: dto.email,
          password_hash,
          telefono: dto.telefono,
          rol_id: rolId,
          organizacion_id: organizacionId,
        },
        select: USUARIO_SELECT,
      });
    });
  }

  async listar(solicitante: Solicitante, { page, limit }: PaginationQueryDto) {
    const where = esPropietario(solicitante)
      ? {
          rol: { nombre: ROLES.OPERARIO },
          organizacion_id: this.organizacionDelPropietario(solicitante),
        }
      : undefined;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.usuario.findMany({
        where,
        select: USUARIO_SELECT,
        orderBy: { fecha_creacion: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.usuario.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async obtener(id: number, solicitante: Solicitante) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: {
        ...USUARIO_SELECT,
        seguridad_cuenta: {
          select: {
            intentos_fallidos: true,
            bloqueado_hasta: true,
            fecha_ultimo_login: true,
          },
        },
      },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    this.verificarOperarioDeLaOrganizacion(usuario, solicitante);
    return usuario;
  }

  async actualizar(
    id: number,
    dto: UpdateUsuarioDto,
    solicitante: Solicitante,
  ) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      include: { rol: true },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    this.verificarOperarioDeLaOrganizacion(usuario, solicitante);

    const cambiaEmail = dto.email && dto.email !== usuario.email;
    const cambiaCedula = dto.cedula && dto.cedula !== usuario.cedula;
    if (cambiaEmail || cambiaCedula) {
      const conflicto = await this.prisma.usuario.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(cambiaEmail ? [{ email: dto.email }] : []),
            ...(cambiaCedula ? [{ cedula: dto.cedula }] : []),
          ],
        },
      });
      if (conflicto)
        throw new ConflictException('Email o cédula ya registrado');
    }

    let rolId = dto.rol_id;
    if (esPropietario(solicitante)) {
      rolId = undefined;
    } else if (dto.rol_id) {
      const rol = await this.prisma.rol.findUnique({
        where: { id: dto.rol_id },
      });
      if (!rol) throw new NotFoundException('Rol no encontrado');
    }

    const password_hash = dto.password
      ? await bcrypt.hash(dto.password, 12)
      : undefined;

    return this.prisma.usuario.update({
      where: { id },
      data: {
        nombre_completo: dto.nombre_completo,
        cedula: dto.cedula,
        email: dto.email,
        telefono: dto.telefono,
        rol_id: rolId,
        activo: dto.activo,
        password_hash,
      },
      select: USUARIO_SELECT,
    });
  }

  async desactivar(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante);
    if (id === solicitante.id) {
      throw new ForbiddenException('No puedes desactivar tu propia cuenta');
    }

    await this.prisma.$transaction([
      this.prisma.sesion.updateMany({
        where: { usuario_id: id, revocada: false },
        data: { revocada: true },
      }),
      this.prisma.usuario.update({ where: { id }, data: { activo: false } }),
    ]);

    return { id, activo: false };
  }

  async activar(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante);

    await this.prisma.usuario.update({ where: { id }, data: { activo: true } });
    return { id, activo: true };
  }

  async eliminarPermanente(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante);
    if (id === solicitante.id) {
      throw new ForbiddenException('No puedes eliminar tu propia cuenta');
    }

    await this.prisma.$transaction([
      this.prisma.sesion.deleteMany({ where: { usuario_id: id } }),
      this.prisma.seguridadCuenta.deleteMany({ where: { usuario_id: id } }),
      this.prisma.usuario.delete({ where: { id } }),
    ]);

    return { id, eliminado: true };
  }
}
