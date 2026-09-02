import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Solicitante } from '../../common/auth/acceso';
import { filtroGalpones } from '../../common/auth/alcance';
import { paginate } from '../../common/pagination/paginate';
import { UsuariosService } from '../usuarios/usuarios.service';
import {
  CreateUsuarioGalponDto,
  ListarUsuarioGalponDto,
} from './dto/create-usuario-galpon.dto';

const SELECT = {
  id: true,
  usuario_id: true,
  galpon_id: true,
  rol_asignacion: true,
  fecha_asignacion: true,
  activa: true,
  usuario: { select: { id: true, nombre_completo: true, email: true } },
  galpon: { select: { id: true, nombre: true, codigo: true } },
} as const;

@Injectable()
export class UsuariosGalponesService {
  constructor(
    private prisma: PrismaService,
    private usuariosService: UsuariosService,
  ) {}

  async crear(dto: CreateUsuarioGalponDto, solicitante: Solicitante) {
    return this.usuariosService.asignarGalpon(
      dto.usuario_id,
      dto.galpon_id,
      dto.rol_asignacion,
      solicitante,
    );
  }

  async listar(dto: ListarUsuarioGalponDto, solicitante: Solicitante) {
    const galpon = filtroGalpones(solicitante);
    const where = {
      ...(dto.usuario_id !== undefined ? { usuario_id: dto.usuario_id } : {}),
      ...(dto.galpon_id !== undefined ? { galpon_id: dto.galpon_id } : {}),
      ...(dto.activa !== undefined ? { activa: dto.activa } : {}),
      // filtroGalpones resuelve los tres roles. Comparar contra
      // propietario_id servia mientras la ruta era solo del dueno; ahora que
      // el operario entra, le habria devuelto la lista vacia, porque su id
      // nunca es el del propietario de la granja.
      ...(galpon ? { galpon } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.usuarioGalpon.findMany({
        where,
        select: SELECT,
        orderBy: { fecha_asignacion: 'desc' },
        skip: (dto.page - 1) * dto.limit,
        take: dto.limit,
      }),
      this.prisma.usuarioGalpon.count({ where }),
    ]);
    return paginate(data, total, dto.page, dto.limit);
  }

  async obtener(id: number, solicitante: Solicitante) {
    const galpon = filtroGalpones(solicitante);
    const asignacion = await this.prisma.usuarioGalpon.findFirst({
      where: {
        id,
        ...(galpon ? { galpon } : {}),
      },
      select: SELECT,
    });
    if (!asignacion) throw new NotFoundException('Asignación no encontrada');
    return asignacion;
  }

  async desactivar(id: number, solicitante: Solicitante) {
    const asignacion = await this.obtener(id, solicitante);
    await this.usuariosService.desasignarGalpon(
      asignacion.usuario_id,
      asignacion.galpon_id,
      solicitante,
    );
    return this.obtener(id, solicitante);
  }

  async activar(id: number, solicitante: Solicitante) {
    const asignacion = await this.obtener(id, solicitante);
    return this.usuariosService.asignarGalpon(
      asignacion.usuario_id,
      asignacion.galpon_id,
      asignacion.rol_asignacion ?? undefined,
      solicitante,
    );
  }
}
