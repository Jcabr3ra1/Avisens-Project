import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/pagination/paginate';
import { filtroGalpones, verificarAccesoGalpon } from '../../common/auth/alcance';
import type { Solicitante } from '../../common/auth/acceso';
import { EnviarMensajeDto } from './dto/enviar-mensaje.dto';
import { ListarMensajesDto } from './dto/listar-mensajes.dto';
import { CrearConversacionPrivadaDto } from './dto/crear-conversacion-privada.dto';
import { EnviarMensajePrivadoDto } from './dto/enviar-mensaje-privado.dto';

const SIN_ACCESO = 'No tienes acceso a las conversaciones de ese galpón';

const MENSAJE_SELECT = {
  id: true,
  galpon_id: true,
  emisor_id: true,
  contenido: true,
  fecha_envio: true,
  fecha_lectura: true,
  emisor: {
    select: { id: true, nombre_completo: true },
  },
} as const;

const MENSAJE_PRIVADO_SELECT = {
  id: true,
  conversacion_id: true,
  emisor_id: true,
  contenido: true,
  fecha_envio: true,
  fecha_lectura: true,
  emisor: { select: { id: true, nombre_completo: true } },
} as const;

@Injectable()
export class MensajesEquipoService {
  constructor(private prisma: PrismaService) {}

  async enviar(dto: EnviarMensajeDto, solicitante: Solicitante) {
    await verificarAccesoGalpon(
      this.prisma,
      dto.galpon_id,
      solicitante,
      SIN_ACCESO,
    );

    return this.prisma.mensajeEquipo.create({
      data: {
        galpon_id: dto.galpon_id,
        // El emisor sale del token, nunca del cuerpo: si viniera del cliente,
        // cualquiera podria escribir haciendose pasar por otro.
        emisor_id: solicitante.id,
        contenido: dto.contenido.trim(),
      },
      select: MENSAJE_SELECT,
    });
  }

  async listarDeGalpon(
    galponId: number,
    solicitante: Solicitante,
    { page, limit, sin_leer }: ListarMensajesDto,
  ) {
    await verificarAccesoGalpon(this.prisma, galponId, solicitante, SIN_ACCESO);

    const where: Prisma.MensajeEquipoWhereInput = {
      galpon_id: galponId,
      ...(sin_leer ? { fecha_lectura: null } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.mensajeEquipo.findMany({
        where,
        select: MENSAJE_SELECT,
        // Del mas reciente al mas antiguo: un chat se lee por el final.
        orderBy: { fecha_envio: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.mensajeEquipo.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  /**
   * Los galpones con conversacion, y cuantos mensajes sin leer tiene cada uno.
   *
   * Es lo que necesita la lista de la pantalla: sin esto habria que pedir los
   * mensajes de cada galpon por separado para saber cuales tienen algo nuevo.
   */
  async resumen(solicitante: Solicitante) {
    const galpon = filtroGalpones(solicitante);

    const grupos = await this.prisma.mensajeEquipo.groupBy({
      by: ['galpon_id'],
      where: galpon ? { galpon } : undefined,
      _count: { _all: true },
      _max: { fecha_envio: true },
      orderBy: { galpon_id: 'asc' },
    });
    if (!grupos.length) return [];

    const ids = grupos.map((g) => g.galpon_id);
    const [galpones, sinLeer] = await Promise.all([
      this.prisma.galpon.findMany({
        where: { id: { in: ids } },
        select: { id: true, nombre: true, codigo: true },
      }),
      this.prisma.mensajeEquipo.groupBy({
        by: ['galpon_id'],
        where: { galpon_id: { in: ids }, fecha_lectura: null },
        _count: { _all: true },
        orderBy: { galpon_id: 'asc' },
      }),
    ]);

    const nombrePorId = new Map(galpones.map((g) => [g.id, g]));
    const sinLeerPorId = new Map(
      sinLeer.map((s) => [s.galpon_id, s._count._all]),
    );

    return grupos
      .map((g) => ({
        galpon_id: g.galpon_id,
        galpon: nombrePorId.get(g.galpon_id) ?? null,
        total: g._count._all,
        sin_leer: sinLeerPorId.get(g.galpon_id) ?? 0,
        ultimo_mensaje: g._max.fecha_envio,
      }))
      .sort(
        (a, b) =>
          (b.ultimo_mensaje?.getTime() ?? 0) - (a.ultimo_mensaje?.getTime() ?? 0),
      );
  }

  async marcarLeidos(galponId: number, solicitante: Solicitante) {
    await verificarAccesoGalpon(this.prisma, galponId, solicitante, SIN_ACCESO);

    // Los propios no se marcan: leer lo que uno mismo escribio no significa
    // nada, y contarlos inflaria el "sin leer" de quien mas participa.
    const { count } = await this.prisma.mensajeEquipo.updateMany({
      where: {
        galpon_id: galponId,
        fecha_lectura: null,
        emisor_id: { not: solicitante.id },
      },
      data: { fecha_lectura: new Date() },
    });

    return { galpon_id: galponId, marcados: count };
  }

  async eliminar(id: number, solicitante: Solicitante) {
    const mensaje = await this.prisma.mensajeEquipo.findUnique({
      where: { id },
      select: { id: true, emisor_id: true, galpon_id: true },
    });
    if (!mensaje) throw new NotFoundException('Mensaje no encontrado');

    // Solo se borra lo propio. Que alguien pueda borrar lo que dijo otro
    // convierte la conversacion en algo que no se puede usar como registro.
    if (mensaje.emisor_id !== solicitante.id) {
      throw new ForbiddenException('Solo puedes borrar tus propios mensajes');
    }

    await this.prisma.mensajeEquipo.delete({ where: { id } });
    return { id, eliminado: true };
  }

  async contactos(galponId: number, solicitante: Solicitante) {
    await verificarAccesoGalpon(this.prisma, galponId, solicitante, SIN_ACCESO);
    const galpon = await this.prisma.galpon.findUnique({
      where: { id: galponId },
      select: {
        granja: {
          select: {
            propietario: {
              select: { id: true, nombre_completo: true, rol: { select: { nombre: true } } },
            },
          },
        },
        usuarios_galpones: {
          where: { activa: true, usuario: { activo: true } },
          select: {
            rol_asignacion: true,
            usuario: {
              select: { id: true, nombre_completo: true, rol: { select: { nombre: true } } },
            },
          },
        },
      },
    });
    if (!galpon) throw new NotFoundException('Galpón no encontrado');

    const contactos = new Map<
      number,
      { id: number; nombre_completo: string; rol: string; rol_asignacion: string | null }
    >();
    if (galpon.granja.propietario.id !== solicitante.id) {
      contactos.set(galpon.granja.propietario.id, {
        id: galpon.granja.propietario.id,
        nombre_completo: galpon.granja.propietario.nombre_completo,
        rol: galpon.granja.propietario.rol.nombre,
        rol_asignacion: 'propietario',
      });
    }
    for (const asignacion of galpon.usuarios_galpones) {
      if (asignacion.usuario.id === solicitante.id) continue;
      contactos.set(asignacion.usuario.id, {
        id: asignacion.usuario.id,
        nombre_completo: asignacion.usuario.nombre_completo,
        rol: asignacion.usuario.rol.nombre,
        rol_asignacion: asignacion.rol_asignacion,
      });
    }

    return [...contactos.values()].sort((a, b) =>
      a.nombre_completo.localeCompare(b.nombre_completo, 'es-CO'),
    );
  }

  async abrirPrivada(
    dto: CrearConversacionPrivadaDto,
    solicitante: Solicitante,
  ) {
    await this.validarDestinatario(dto.galpon_id, dto.destinatario_id, solicitante);
    const participanteUnoId = Math.min(solicitante.id, dto.destinatario_id);
    const participanteDosId = Math.max(solicitante.id, dto.destinatario_id);

    return this.prisma.conversacionPrivadaEquipo.upsert({
      where: {
        galpon_id_participante_uno_id_participante_dos_id: {
          galpon_id: dto.galpon_id,
          participante_uno_id: participanteUnoId,
          participante_dos_id: participanteDosId,
        },
      },
      create: {
        galpon_id: dto.galpon_id,
        participante_uno_id: participanteUnoId,
        participante_dos_id: participanteDosId,
      },
      update: {},
      select: this.conversacionSelect(solicitante.id),
    });
  }

  async listarPrivadas(galponId: number, solicitante: Solicitante) {
    await verificarAccesoGalpon(this.prisma, galponId, solicitante, SIN_ACCESO);
    return this.prisma.conversacionPrivadaEquipo.findMany({
      where: {
        galpon_id: galponId,
        OR: [
          { participante_uno_id: solicitante.id },
          { participante_dos_id: solicitante.id },
        ],
      },
      select: this.conversacionSelect(solicitante.id),
      orderBy: [{ ultimo_mensaje_en: 'desc' }, { fecha_creacion: 'desc' }],
    });
  }

  async listarMensajesPrivados(
    conversacionId: number,
    solicitante: Solicitante,
    { page, limit, sin_leer }: ListarMensajesDto,
  ) {
    await this.obtenerPrivadaAccesible(conversacionId, solicitante);
    const where: Prisma.MensajePrivadoEquipoWhereInput = {
      conversacion_id: conversacionId,
      ...(sin_leer ? { fecha_lectura: null, emisor_id: { not: solicitante.id } } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.mensajePrivadoEquipo.findMany({
        where,
        select: MENSAJE_PRIVADO_SELECT,
        orderBy: { fecha_envio: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.mensajePrivadoEquipo.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  async enviarPrivado(
    conversacionId: number,
    dto: EnviarMensajePrivadoDto,
    solicitante: Solicitante,
  ) {
    await this.obtenerPrivadaAccesible(conversacionId, solicitante);
    const ahora = new Date();
    const [mensaje] = await this.prisma.$transaction([
      this.prisma.mensajePrivadoEquipo.create({
        data: {
          conversacion_id: conversacionId,
          emisor_id: solicitante.id,
          contenido: dto.contenido.trim(),
        },
        select: MENSAJE_PRIVADO_SELECT,
      }),
      this.prisma.conversacionPrivadaEquipo.update({
        where: { id: conversacionId },
        data: { ultimo_mensaje_en: ahora },
      }),
    ]);
    return mensaje;
  }

  async marcarPrivadosLeidos(conversacionId: number, solicitante: Solicitante) {
    await this.obtenerPrivadaAccesible(conversacionId, solicitante);
    const { count } = await this.prisma.mensajePrivadoEquipo.updateMany({
      where: {
        conversacion_id: conversacionId,
        fecha_lectura: null,
        emisor_id: { not: solicitante.id },
      },
      data: { fecha_lectura: new Date() },
    });
    return { conversacion_id: conversacionId, marcados: count };
  }

  private conversacionSelect(usuarioId: number) {
    return {
      id: true,
      galpon_id: true,
      fecha_creacion: true,
      ultimo_mensaje_en: true,
      participante_uno: { select: { id: true, nombre_completo: true } },
      participante_dos: { select: { id: true, nombre_completo: true } },
      mensajes: {
        take: 1,
        orderBy: { fecha_envio: 'desc' as const },
        select: { contenido: true, fecha_envio: true },
      },
      _count: {
        select: {
          mensajes: {
            where: { fecha_lectura: null, emisor_id: { not: usuarioId } },
          },
        },
      },
    } as const;
  }

  private async validarDestinatario(
    galponId: number,
    destinatarioId: number,
    solicitante: Solicitante,
  ) {
    if (destinatarioId === solicitante.id) {
      throw new BadRequestException('No puedes abrir una conversación privada contigo mismo');
    }
    const contactos = await this.contactos(galponId, solicitante);
    if (!contactos.some((contacto) => contacto.id === destinatarioId)) {
      throw new ForbiddenException('La persona no pertenece al equipo de este galpón');
    }
  }

  private async obtenerPrivadaAccesible(
    conversacionId: number,
    solicitante: Solicitante,
  ) {
    const conversacion = await this.prisma.conversacionPrivadaEquipo.findFirst({
      where: {
        id: conversacionId,
        OR: [
          { participante_uno_id: solicitante.id },
          { participante_dos_id: solicitante.id },
        ],
      },
      select: { id: true, galpon_id: true },
    });
    if (!conversacion) {
      throw new NotFoundException('Conversación privada no encontrada');
    }
    await verificarAccesoGalpon(this.prisma, conversacion.galpon_id, solicitante, SIN_ACCESO);
    return conversacion;
  }
}
