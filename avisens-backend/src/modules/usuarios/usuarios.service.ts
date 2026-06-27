import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  async crear(dto: CreateUsuarioDto) {
    const existe = await this.prisma.usuario.findFirst({
      where: { OR: [{ email: dto.email }, { cedula: dto.cedula }] },
    });
    if (existe) throw new ConflictException('Email o cédula ya registrado');

    const rol = await this.prisma.rol.findUnique({ where: { id: dto.rol_id } });
    if (!rol) throw new NotFoundException('Rol no encontrado');

    const password_hash = await bcrypt.hash(dto.password, 12);

    const usuario = await this.prisma.usuario.create({
      data: {
        nombre_completo: dto.nombre_completo,
        cedula: dto.cedula,
        email: dto.email,
        password_hash,
        telefono: dto.telefono,
        rol_id: dto.rol_id,
      },
      select: {
        id: true,
        nombre_completo: true,
        email: true,
        cedula: true,
        telefono: true,
        activo: true,
        fecha_creacion: true,
        rol: { select: { id: true, nombre: true } },
      },
    });

    return usuario;
  }

  async listar() {
    return this.prisma.usuario.findMany({
      select: {
        id: true,
        nombre_completo: true,
        email: true,
        cedula: true,
        telefono: true,
        activo: true,
        fecha_creacion: true,
        rol: { select: { id: true, nombre: true } },
      },
      orderBy: { fecha_creacion: 'desc' },
    });
  }

  async obtener(id: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nombre_completo: true,
        email: true,
        cedula: true,
        telefono: true,
        activo: true,
        fecha_creacion: true,
        rol: { select: { id: true, nombre: true } },
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
    return usuario;
  }

  async actualizar(id: number, dto: UpdateUsuarioDto) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    // Si cambia email o cédula, verificar que no choquen con otro usuario.
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
      if (conflicto) throw new ConflictException('Email o cédula ya registrado');
    }

    if (dto.rol_id) {
      const rol = await this.prisma.rol.findUnique({ where: { id: dto.rol_id } });
      if (!rol) throw new NotFoundException('Rol no encontrado');
    }

    // Solo re-hashear si llega una contraseña nueva.
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
        rol_id: dto.rol_id,
        activo: dto.activo,
        password_hash,
      },
      select: {
        id: true,
        nombre_completo: true,
        email: true,
        cedula: true,
        telefono: true,
        activo: true,
        fecha_creacion: true,
        rol: { select: { id: true, nombre: true } },
      },
    });
  }

  async desactivar(id: number) {
    await this.obtener(id);
    return this.prisma.usuario.update({
      where: { id },
      data: { activo: false },
      select: { id: true, activo: true },
    });
  }
}
