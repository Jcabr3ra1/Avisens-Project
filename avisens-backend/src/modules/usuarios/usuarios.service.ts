import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

const ROL_PROPIETARIO = 'Propietario';
const ROL_OPERARIO = 'Operario';

// Quién hace la petición. Su rol decide el alcance:
// - Administrador: gestiona todos los usuarios.
// - Propietario: solo gestiona Operarios.
type Solicitante = { id: number; rol: string };

const USUARIO_SELECT = {
  id: true,
  nombre_completo: true,
  email: true,
  cedula: true,
  telefono: true,
  activo: true,
  fecha_creacion: true,
  rol: { select: { id: true, nombre: true } },
} as const;

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  private esPropietario(solicitante: Solicitante): boolean {
    return solicitante.rol === ROL_PROPIETARIO;
  }

  async crear(dto: CreateUsuarioDto, solicitante: Solicitante) {
    // No pre-validamos duplicados: la restricción unique de email/cedula + el
    // PrismaExceptionFilter devuelven 409 automáticamente si ya existe.

    // Un Propietario solo puede crear Operarios (ignora el rol que mande).
    let rolId = dto.rol_id;
    if (this.esPropietario(solicitante)) {
      const rolOperario = await this.prisma.rol.findUnique({
        where: { nombre: ROL_OPERARIO },
      });
      if (!rolOperario) throw new NotFoundException('Rol Operario no encontrado');
      rolId = rolOperario.id;
    } else {
      const rol = await this.prisma.rol.findUnique({ where: { id: dto.rol_id } });
      if (!rol) throw new NotFoundException('Rol no encontrado');
    }

    const password_hash = await bcrypt.hash(dto.password, 12);

    return this.prisma.usuario.create({
      data: {
        nombre_completo: dto.nombre_completo,
        cedula: dto.cedula,
        email: dto.email,
        password_hash,
        telefono: dto.telefono,
        rol_id: rolId,
      },
      select: USUARIO_SELECT,
    });
  }

  async listar(solicitante: Solicitante) {
    return this.prisma.usuario.findMany({
      // El Propietario solo ve Operarios; el Admin ve todos.
      where: this.esPropietario(solicitante)
        ? { rol: { nombre: ROL_OPERARIO } }
        : undefined,
      select: USUARIO_SELECT,
      orderBy: { fecha_creacion: 'desc' },
    });
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
    if (this.esPropietario(solicitante) && usuario.rol.nombre !== ROL_OPERARIO) {
      throw new ForbiddenException('Solo puedes gestionar operarios');
    }
    return usuario;
  }

  async actualizar(id: number, dto: UpdateUsuarioDto, solicitante: Solicitante) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      include: { rol: true },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    if (this.esPropietario(solicitante) && usuario.rol.nombre !== ROL_OPERARIO) {
      throw new ForbiddenException('Solo puedes gestionar operarios');
    }

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

    // El Propietario no puede cambiar el rol (el operario sigue siendo operario).
    let rolId = dto.rol_id;
    if (this.esPropietario(solicitante)) {
      rolId = undefined;
    } else if (dto.rol_id) {
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
        rol_id: rolId,
        activo: dto.activo,
        password_hash,
      },
      select: USUARIO_SELECT,
    });
  }

  async desactivar(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante); // valida existencia y alcance
    if (id === solicitante.id) {
      throw new ForbiddenException('No puedes desactivar tu propia cuenta');
    }

    // Borrado suave: la cuenta queda inactiva y se revocan sus sesiones para
    // cerrarle el acceso de inmediato. Los datos y el rastro se conservan.
    await this.prisma.$transaction([
      this.prisma.sesion.updateMany({
        where: { usuario_id: id, revocada: false },
        data: { revocada: true },
      }),
      this.prisma.usuario.update({ where: { id }, data: { activo: false } }),
    ]);

    return { id, activo: false };
  }

  async eliminarPermanente(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante); // valida existencia y alcance
    if (id === solicitante.id) {
      throw new ForbiddenException('No puedes eliminar tu propia cuenta');
    }

    // Borrado permanente (casos legales): primero los datos relacionados
    // (sesiones y seguridad tienen FK ON DELETE RESTRICT), luego el usuario.
    await this.prisma.$transaction([
      this.prisma.sesion.deleteMany({ where: { usuario_id: id } }),
      this.prisma.seguridadCuenta.deleteMany({ where: { usuario_id: id } }),
      this.prisma.usuario.delete({ where: { id } }),
    ]);

    return { id, eliminado: true };
  }
}
