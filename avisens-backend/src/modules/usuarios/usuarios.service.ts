import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';
import { normalizarUsername } from '../../common/auth/username';
import { ROLES } from '../../common/auth/roles';
import { esPropietario } from '../../common/auth/acceso';
import type { Solicitante } from '../../common/auth/acceso';
import {
  MENSAJE_ASIGNACION_OCUPADA,
  MENSAJE_USUARIO_OCUPADO,
} from '../../common/errores/bloqueo';
import {
  eliminarAsignacionesDelUsuario,
  eliminarSesionesDelUsuario,
  revocarAsignacionesDelUsuario,
  revocarSesionesDelUsuario,
} from '../../common/bloqueos/revocar-acceso';
import {
  esEsperaVencida,
  TOPE_ESPERA_ASIGNACION_MS,
  TOPE_ESPERA_ESCRITURA_MS,
  transaccionConPresupuesto,
} from '../../common/bloqueos/presupuesto-transaccion';

const USUARIO_SELECT = {
  id: true,
  nombre_completo: true,
  username: true,
  email: true,
  cedula: true,
  telefono: true,
  activo: true,
  fecha_creacion: true,
  organizacion_id: true,
  rol: { select: { id: true, nombre: true } },
  organizacion: { select: { id: true, nombre: true } },
} as const;

const ASIGNACION_SELECT = {
  id: true,
  usuario_id: true,
  galpon_id: true,
  rol_asignacion: true,
  fecha_asignacion: true,
  activa: true,
  galpon: {
    select: {
      id: true,
      codigo: true,
      nombre: true,
      activo: true,
      granja: {
        select: {
          id: true,
          nombre: true,
          propietario_id: true,
          organizacion_id: true,
        },
      },
    },
  },
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

  private async obtenerOperarioParaAsignacion(
    usuarioId: number,
    solicitante: Solicitante,
    exigirActivo = false,
    cliente: Prisma.TransactionClient = this.prisma,
  ) {
    const usuario = await cliente.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        id: true,
        activo: true,
        organizacion_id: true,
        rol: { select: { nombre: true } },
      },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    this.verificarOperarioDeLaOrganizacion(usuario, solicitante);
    if (usuario.rol.nombre !== ROLES.OPERARIO) {
      throw new BadRequestException('Solo se pueden asignar usuarios Operario');
    }
    if (!usuario.organizacion_id) {
      throw new BadRequestException('El Operario no tiene una organización');
    }
    if (exigirActivo && !usuario.activo) {
      throw new BadRequestException('No se puede asignar un Operario inactivo');
    }

    return usuario;
  }

  private async validarGalponParaOperario(
    galponId: number,
    organizacionId: number,
    solicitante: Solicitante,
    exigirActivo = false,
    cliente: Prisma.TransactionClient = this.prisma,
  ) {
    const galpon = await cliente.galpon.findUnique({
      where: { id: galponId },
      select: {
        id: true,
        activo: true,
        granja: {
          select: { propietario_id: true, organizacion_id: true },
        },
      },
    });

    if (!galpon) {
      throw new NotFoundException('Galpón no encontrado');
    }
    if (
      esPropietario(solicitante) &&
      galpon.granja.propietario_id !== solicitante.id
    ) {
      throw new ForbiddenException(
        'Solo puedes asignar operarios a galpones de tus propias granjas',
      );
    }
    if (galpon.granja.organizacion_id !== organizacionId) {
      throw new BadRequestException(
        'El Operario y el galpón deben pertenecer a la misma organización',
      );
    }
    if (exigirActivo && !galpon.activo) {
      throw new BadRequestException('No se puede asignar un galpón inactivo');
    }

    return galpon;
  }

  /**
   * El alta de un usuario, dentro de una transaccion que abre quien llama.
   *
   * Lo usan dos caminos: el alta normal y la conversion de un prospecto en
   * cliente. Si la conversion copiara esta logica —validar el rol, resolver la
   * organizacion, decidir si hay que crearla— las dos se separarian en cuanto
   * alguien tocara una, y entonces un cliente creado desde el CRM tendria
   * reglas distintas a uno creado desde Personas.
   *
   * El hash de la contrasena se recibe hecho: cuesta unos 100 ms y no toca la
   * base, asi que no tiene por que mantener una transaccion abierta.
   */
  async altaDeUsuario(
    tx: Prisma.TransactionClient,
    dto: CreateUsuarioDto,
    solicitante: Solicitante,
    password_hash: string,
  ) {
    let rolId = dto.rol_id;
    let organizacionId: number | undefined;
    let nuevaOrganizacion: string | undefined;

    if (esPropietario(solicitante)) {
      const rolOperario = await tx.rol.findUnique({
        where: { nombre: ROLES.OPERARIO },
      });
      if (!rolOperario)
        throw new NotFoundException('Rol Operario no encontrado');
      rolId = rolOperario.id;
      organizacionId = this.organizacionDelPropietario(solicitante);
    } else {
      const rol = await tx.rol.findUnique({ where: { id: dto.rol_id } });
      if (!rol) throw new NotFoundException('Rol no encontrado');

      if (dto.organizacion_id) {
        const organizacion = await tx.organizacion.findFirst({
          where: { id: dto.organizacion_id, activa: true },
          select: { id: true },
        });
        if (!organizacion) {
          throw new NotFoundException('Organización no encontrada o inactiva');
        }
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
        username: normalizarUsername(dto.username),
        email: dto.email?.trim().toLowerCase() || null,
        password_hash,
        telefono: dto.telefono,
        rol_id: rolId,
        organizacion_id: organizacionId,
      },
      select: USUARIO_SELECT,
    });
  }

  async crear(dto: CreateUsuarioDto, solicitante: Solicitante) {
    const password_hash = await bcrypt.hash(dto.password, 12);
    return this.prisma.$transaction((tx) =>
      this.altaDeUsuario(tx, dto, solicitante, password_hash),
    );
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

  listarRoles(solicitante: Solicitante) {
    return this.prisma.rol.findMany({
      where: esPropietario(solicitante)
        ? { nombre: ROLES.OPERARIO }
        : undefined,
      select: { id: true, nombre: true },
      orderBy: { id: 'asc' },
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
    if (dto.activo === false && id === solicitante.id) {
      throw new ForbiddenException('No puedes desactivar tu propia cuenta');
    }

    const username =
      dto.username === undefined ? undefined : normalizarUsername(dto.username);
    const cambiaUsername =
      username !== undefined && username !== usuario.username;
    const cambiaEmail = dto.email && dto.email !== usuario.email;
    const cambiaCedula = dto.cedula && dto.cedula !== usuario.cedula;
    if (cambiaUsername || cambiaEmail || cambiaCedula) {
      const conflicto = await this.prisma.usuario.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(cambiaUsername ? [{ username }] : []),
            ...(cambiaEmail ? [{ email: dto.email }] : []),
            ...(cambiaCedula ? [{ cedula: dto.cedula }] : []),
          ],
        },
      });
      if (conflicto)
        throw new ConflictException('Usuario, correo o cédula ya registrado');
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

    const data = {
      nombre_completo: dto.nombre_completo,
      cedula: dto.cedula,
      username,
      email:
        dto.email === undefined
          ? undefined
          : dto.email?.trim().toLowerCase() || null,
      telefono: dto.telefono,
      rol_id: rolId,
      activo: dto.activo,
    };

    if (dto.activo !== false) {
      return this.prisma.usuario.update({
        where: { id },
        data,
        select: USUARIO_SELECT,
      });
    }

    try {
      return await transaccionConPresupuesto(
        this.prisma,
        TOPE_ESPERA_ESCRITURA_MS,
        async (p) => {
          await p.paso('actualizar usuario', (tx) =>
            tx.usuario.update({ where: { id }, data, select: { id: true } }),
          );
          const actualizado = await p.paso(
            'leer usuario actualizado',
            (tx) =>
              tx.usuario.findUniqueOrThrow({
                where: { id },
                select: USUARIO_SELECT,
              }),
            3,
          );
          await revocarSesionesDelUsuario(p, id);
          await revocarAsignacionesDelUsuario(p, id);
          return actualizado;
        },
      );
    } catch (error) {
      this.traducirTimeoutDeUsuario(error);
      throw error;
    }
  }

  private traducirTimeoutDeUsuario(error: unknown): void {
    if (esEsperaVencida(error)) {
      throw new ConflictException(MENSAJE_USUARIO_OCUPADO);
    }
  }

  async asignarGalpon(
    usuarioId: number,
    galponId: number,
    rolAsignacion: string | undefined,
    solicitante: Solicitante,
  ) {
    try {
      return await transaccionConPresupuesto(
        this.prisma,
        TOPE_ESPERA_ASIGNACION_MS,
        async (p) => {
          await p.paso(
            'bloquear usuario',
            (tx) =>
              tx.$queryRaw`SELECT "id" FROM "usuarios" WHERE "id" = ${usuarioId} FOR SHARE`,
          );
          const operario = await p.paso(
            'leer operario',
            (tx) =>
              this.obtenerOperarioParaAsignacion(
                usuarioId,
                solicitante,
                true,
                tx,
              ),
            2,
          );
          await p.paso(
            'bloquear galpón',
            (tx) =>
              tx.$queryRaw`SELECT "id" FROM "galpones" WHERE "id" = ${galponId} FOR NO KEY UPDATE`,
          );
          await p.paso(
            'leer galpón',
            (tx) =>
              this.validarGalponParaOperario(
                galponId,
                operario.organizacion_id!,
                solicitante,
                true,
                tx,
              ),
            2,
          );

          const previa = await p.paso('buscar asignación', (tx) =>
            tx.usuarioGalpon.findUnique({
              where: {
                usuario_id_galpon_id: {
                  usuario_id: usuarioId,
                  galpon_id: galponId,
                },
              },
              select: { id: true },
            }),
          );
          const fila = previa
            ? await p.paso('reactivar asignación', (tx) =>
                tx.usuarioGalpon.update({
                  where: { id: previa.id },
                  data: {
                    activa: true,
                    rol_asignacion: rolAsignacion,
                    fecha_asignacion: new Date(),
                  },
                  select: { id: true },
                }),
              )
            : await p.paso('crear asignación', (tx) =>
                tx.usuarioGalpon.create({
                  data: {
                    usuario_id: usuarioId,
                    galpon_id: galponId,
                    rol_asignacion: rolAsignacion,
                  },
                  select: { id: true },
                }),
              );
          return p.paso(
            'leer asignación',
            (tx) =>
              tx.usuarioGalpon.findUniqueOrThrow({
                where: { id: fila.id },
                select: ASIGNACION_SELECT,
              }),
            3,
          );
        },
      );
    } catch (error) {
      if (esEsperaVencida(error)) {
        throw new ConflictException(MENSAJE_ASIGNACION_OCUPADA);
      }
      throw error;
    }
  }

  async listarGalponesAsignados(
    usuarioId: number,
    solicitante: Solicitante,
    { page, limit }: PaginationQueryDto,
  ) {
    await this.obtenerOperarioParaAsignacion(usuarioId, solicitante);

    const where = {
      usuario_id: usuarioId,
      ...(esPropietario(solicitante)
        ? { galpon: { granja: { propietario_id: solicitante.id } } }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.usuarioGalpon.findMany({
        where,
        select: ASIGNACION_SELECT,
        orderBy: { fecha_asignacion: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.usuarioGalpon.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async desasignarGalpon(
    usuarioId: number,
    galponId: number,
    solicitante: Solicitante,
  ) {
    const operario = await this.obtenerOperarioParaAsignacion(
      usuarioId,
      solicitante,
    );
    await this.validarGalponParaOperario(
      galponId,
      operario.organizacion_id!,
      solicitante,
    );

    const asignacion = await this.prisma.usuarioGalpon.findUnique({
      where: {
        usuario_id_galpon_id: {
          usuario_id: usuarioId,
          galpon_id: galponId,
        },
      },
      select: { id: true, activa: true },
    });
    if (!asignacion?.activa) {
      throw new NotFoundException('Asignación activa no encontrada');
    }

    await this.prisma.usuarioGalpon.update({
      where: { id: asignacion.id },
      data: { activa: false },
    });
    return { usuario_id: usuarioId, galpon_id: galponId, activa: false };
  }

  async desactivar(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante);
    if (id === solicitante.id) {
      throw new ForbiddenException('No puedes desactivar tu propia cuenta');
    }

    try {
      await transaccionConPresupuesto(
        this.prisma,
        TOPE_ESPERA_ESCRITURA_MS,
        async (p) => {
          await p.paso('desactivar usuario', (tx) =>
            tx.usuario.update({ where: { id }, data: { activo: false } }),
          );
          await revocarSesionesDelUsuario(p, id);
          await revocarAsignacionesDelUsuario(p, id);
        },
      );
    } catch (error) {
      this.traducirTimeoutDeUsuario(error);
      throw error;
    }

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

    try {
      await transaccionConPresupuesto(
        this.prisma,
        TOPE_ESPERA_ESCRITURA_MS,
        async (p) => {
          await p.paso(
            'bloquear usuario',
            (tx) =>
              tx.$queryRaw`SELECT "id" FROM "usuarios" WHERE "id" = ${id} FOR UPDATE`,
          );
          await eliminarSesionesDelUsuario(p, id);
          await p.paso('eliminar seguridad de cuenta', (tx) =>
            tx.seguridadCuenta.deleteMany({ where: { usuario_id: id } }),
          );
          await eliminarAsignacionesDelUsuario(p, id);
          await p.paso('eliminar usuario', (tx) =>
            tx.usuario.delete({ where: { id } }),
          );
        },
      );
    } catch (error) {
      this.traducirTimeoutDeUsuario(error);
      throw error;
    }

    return { id, eliminado: true };
  }
}
