import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUsuarioGalponDto, ListarUsuarioGalponDto } from './dto/create-usuario-galpon.dto';

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
  constructor(private prisma: PrismaService) {}

  async crear(dto: CreateUsuarioGalponDto) {
    try {
      return await this.prisma.usuarioGalpon.create({
        data: {
          usuario_id: dto.usuario_id,
          galpon_id: dto.galpon_id,
          rol_asignacion: dto.rol_asignacion,
        },
        select: SELECT,
      });
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        throw new ConflictException('Este usuario ya está asignado a este galpón');
      }
      throw error;
    }
  }

  async listar(dto: ListarUsuarioGalponDto) {
    const where = {
      ...(dto.usuario_id ? { usuario_id: dto.usuario_id } : {}),
      ...(dto.galpon_id ? { galpon_id: dto.galpon_id } : {}),
      ...(dto.activa !== undefined ? { activa: dto.activa } : {}),
    };
    return this.prisma.usuarioGalpon.findMany({
      where,
      select: SELECT,
      orderBy: { fecha_asignacion: 'desc' },
    });
  }

  async obtener(id: number) {
    const asignacion = await this.prisma.usuarioGalpon.findUnique({
      where: { id },
      select: SELECT,
    });
    if (!asignacion) throw new NotFoundException('Asignación no encontrada');
    return asignacion;
  }

  async desactivar(id: number) {
    await this.obtener(id);
    return this.prisma.usuarioGalpon.update({
      where: { id },
      data: { activa: false },
      select: SELECT,
    });
  }

  async activar(id: number) {
    await this.obtener(id);
    return this.prisma.usuarioGalpon.update({
      where: { id },
      data: { activa: true },
      select: SELECT,
    });
  }

  async eliminar(id: number) {
    await this.obtener(id);
    await this.prisma.usuarioGalpon.delete({ where: { id } });
    return { id, eliminado: true };
  }
}
