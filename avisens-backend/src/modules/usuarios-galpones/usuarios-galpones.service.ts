// usuarios-galpones.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUsuarioGalponDto } from './dto/create-usuario-galpon.dto';
import { UpdateUsuarioGalponDto } from './dto/update-usuario-galpon.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';
import { esPropietario, verificarDueno } from '../../common/auth/acceso';
import type { Solicitante } from '../../common/auth/acceso';

const USUARIO_GALPON_SELECT = {
  id: true,
  usuario_id: true,
  galpon_id: true,
  rol_asignacion: true,
  fecha_asignacion: true,
  activa: true,
  usuario: {
    select: {
      id: true,
      nombre_completo: true,
      email: true,
      cedula: true,
      telefono: true,
      rol_id: true,
    },
  },
  galpon: {
    select: {
      id: true,
      nombre: true,
      codigo: true,
      granja: {
        select: {
          id: true,
          nombre: true,
          propietario_id: true,
        },
      },
    },
  },
} as const;

@Injectable()
export class UsuariosGalponesService {
  constructor(private prisma: PrismaService) {}

  // ============================================================
  // VALIDACIONES PRIVADAS
  // ============================================================

  private async validarUsuario(usuarioId: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        id: true,
        nombre_completo: true,
        email: true,
        activo: true,
      },
    });

    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${usuarioId} no encontrado`);
    }

    if (!usuario.activo) {
      throw new BadRequestException(
        `El usuario "${usuario.nombre_completo}" está inactivo`,
      );
    }

    return usuario;
  }

  private async validarGalpon(galponId: number, solicitante: Solicitante) {
    const galpon = await this.prisma.galpon.findUnique({
      where: { id: galponId },
      include: {
        granja: true,
      },
    });

    if (!galpon) {
      throw new NotFoundException(`Galpón con ID ${galponId} no encontrado`);
    }

    verificarDueno(
      solicitante,
      galpon.granja.propietario_id,
      'No tienes acceso a este galpón',
    );

    return galpon;
  }

  private async validarAsignacionConAcceso(
    id: number,
    solicitante: Solicitante,
  ) {
    const asignacion = await this.prisma.usuarioGalpon.findUnique({
      where: { id },
      select: USUARIO_GALPON_SELECT,
    });

    if (!asignacion) {
      throw new NotFoundException(`Asignación con ID ${id} no encontrada`);
    }

    verificarDueno(
      solicitante,
      asignacion.galpon.granja.propietario_id,
      'No tienes acceso a esta asignación',
    );

    return asignacion;
  }

  private async validarAsignacionUnica(usuarioId: number, galponId: number) {
    const existente = await this.prisma.usuarioGalpon.findFirst({
      where: {
        usuario_id: usuarioId,
        galpon_id: galponId,
        activa: true,
      },
    });

    if (existente) {
      throw new BadRequestException(
        `El usuario ya está asignado a este galpón`,
      );
    }
  }

  // ============================================================
  // MÉTODOS PÚBLICOS
  // ============================================================

  async crear(dto: CreateUsuarioGalponDto, solicitante: Solicitante) {
    // Validar que el usuario existe
    await this.validarUsuario(dto.usuario_id);

    // Validar que el galpón existe y el solicitante tiene acceso
    await this.validarGalpon(dto.galpon_id, solicitante);

    // Validar que no exista una asignación activa duplicada
    await this.validarAsignacionUnica(dto.usuario_id, dto.galpon_id);

    return this.prisma.usuarioGalpon.create({
      data: {
        usuario_id: dto.usuario_id,
        galpon_id: dto.galpon_id,
        rol_asignacion: dto.rol_asignacion,
        activa: dto.activa !== undefined ? dto.activa : true,
      },
      select: USUARIO_GALPON_SELECT,
    });
  }

  async listar(solicitante: Solicitante, { page, limit }: PaginationQueryDto) {
    const where = esPropietario(solicitante)
      ? {
          galpon: {
            granja: {
              propietario_id: solicitante.id,
            },
          },
        }
      : {};

    const [data, total] = await this.prisma.$transaction([
      this.prisma.usuarioGalpon.findMany({
        where,
        select: USUARIO_GALPON_SELECT,
        orderBy: { id: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.usuarioGalpon.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async obtener(id: number, solicitante: Solicitante) {
    return this.validarAsignacionConAcceso(id, solicitante);
  }

  async actualizar(
    id: number,
    dto: UpdateUsuarioGalponDto,
    solicitante: Solicitante,
  ) {
    await this.validarAsignacionConAcceso(id, solicitante);

    const data: any = {};

    if (dto.rol_asignacion !== undefined) {
      data.rol_asignacion = dto.rol_asignacion;
    }

    if (dto.activa !== undefined) {
      data.activa = dto.activa;
    }

    if (Object.keys(data).length === 0) {
      return this.validarAsignacionConAcceso(id, solicitante);
    }

    return this.prisma.usuarioGalpon.update({
      where: { id },
      data,
      select: USUARIO_GALPON_SELECT,
    });
  }

  async activar(id: number, solicitante: Solicitante) {
    await this.validarAsignacionConAcceso(id, solicitante);

    return this.prisma.usuarioGalpon.update({
      where: { id },
      data: { activa: true },
      select: USUARIO_GALPON_SELECT,
    });
  }

  async desactivar(id: number, solicitante: Solicitante) {
    await this.validarAsignacionConAcceso(id, solicitante);

    return this.prisma.usuarioGalpon.update({
      where: { id },
      data: { activa: false },
      select: USUARIO_GALPON_SELECT,
    });
  }

  async eliminar(id: number, solicitante: Solicitante) {
    await this.validarAsignacionConAcceso(id, solicitante);

    await this.prisma.usuarioGalpon.delete({
      where: { id },
    });

    return { id, eliminado: true };
  }

  async obtenerPorUsuario(
    usuarioId: number,
    solicitante: Solicitante,
    paginacion: PaginationQueryDto,
  ) {
    const { page, limit } = paginacion;

    // Validar que el usuario existe
    await this.validarUsuario(usuarioId);

    const where = { usuario_id: usuarioId };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.usuarioGalpon.findMany({
        where,
        select: USUARIO_GALPON_SELECT,
        orderBy: { id: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.usuarioGalpon.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async obtenerPorGalpon(
    galponId: number,
    solicitante: Solicitante,
    paginacion: PaginationQueryDto,
  ) {
    const { page, limit } = paginacion;

    await this.validarGalpon(galponId, solicitante);

    const where = { galpon_id: galponId };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.usuarioGalpon.findMany({
        where,
        select: USUARIO_GALPON_SELECT,
        orderBy: { id: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.usuarioGalpon.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }
}
