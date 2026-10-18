import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';
import { CreateOrganizacionDto } from './dto/create-organizacion.dto';
import { UpdateOrganizacionDto } from './dto/update-organizacion.dto';
import {
  revocarAsignacionesDeLaOrganizacion,
  revocarSesionesDeLaOrganizacion,
} from '../../common/bloqueos/revocar-acceso';
import {
  esEsperaVencida,
  TOPE_ESPERA_ESCRITURA_MS,
  transaccionConPresupuesto,
} from '../../common/bloqueos/presupuesto-transaccion';
import { MENSAJE_ORGANIZACION_OCUPADA } from '../../common/errores/bloqueo';
import { SENSOR_VIGENTE } from '../sensores/sensor-vigente';

const TOPE_BORRADO_MS = 120_000;

export interface ImpactoEliminacion {
  organizacion: { id: number; nombre: string };
  usuarios: number;
  granjas: number;
  galpones: number;
  lotes: number;
  dispositivos: number;
  sensores: number;
  mediciones: number;
  registros: number;
  alertas: number;
}

const ORGANIZACION_SELECT = {
  id: true,
  nombre: true,
  nit: true,
  plan: true,
  activa: true,
  fecha_creacion: true,
  _count: { select: { usuarios: true, granjas: true } },
} as const;

// Vista contextual con datos que cuelgan de relaciones existentes. Los
// campos de contraseña, hashes de token y cuerpos privados no se seleccionan.
const ORGANIZACION_DETALLE_SELECT = {
  ...ORGANIZACION_SELECT,
  usuarios: {
    orderBy: { nombre_completo: 'asc' },
    select: {
      id: true,
      nombre_completo: true,
      email: true,
      telefono: true,
      activo: true,
      fecha_creacion: true,
      rol: { select: { nombre: true } },
      seguridad_cuenta: {
        select: {
          bloqueado_hasta: true,
          fecha_ultimo_login: true,
          fecha_ultimo_cambio_password: true,
          debe_cambiar_password: true,
          password_temporal_expira_en: true,
        },
      },
      recuperaciones_solicitadas: {
        take: 3,
        orderBy: { fecha_creacion: 'desc' },
        select: {
          id: true,
          estado: true,
          fecha_creacion: true,
          atendida_en: true,
        },
      },
      prospectos_convertidos: {
        take: 5,
        orderBy: { fecha_inicio: 'desc' },
        select: {
          id: true,
          nombre: true,
          nombre_granja: true,
          estado: true,
          fecha_inicio: true,
          solicitudes: {
            take: 5,
            orderBy: { fecha_creacion: 'desc' },
            select: {
              id: true,
              categoria: true,
              asunto: true,
              estado: true,
              fecha_creacion: true,
              fecha_cierre: true,
            },
          },
        },
      },
      _count: {
        select: {
          recuperaciones_solicitadas: true,
          prospectos_convertidos: true,
        },
      },
    },
  },
  granjas: {
    orderBy: { nombre: 'asc' },
    select: {
      id: true,
      nombre: true,
      direccion: true,
      municipio: true,
      departamento: true,
      area_total_m2: true,
      activa: true,
      propietario: {
        select: {
          id: true,
          nombre_completo: true,
          email: true,
          telefono: true,
          activo: true,
        },
      },
      galpones: {
        orderBy: { nombre: 'asc' },
        select: {
          id: true,
          codigo: true,
          nombre: true,
          activo: true,
          _count: {
            select: {
              dispositivo: { where: { retirado_en: null } },
              sensores: { where: SENSOR_VIGENTE },
            },
          },
        },
      },
    },
  },
} as const;

@Injectable()
export class OrganizacionesService {
  constructor(private prisma: PrismaService) {}

  crear(dto: CreateOrganizacionDto) {
    return this.prisma.organizacion.create({
      data: {
        nombre: dto.nombre.trim(),
        nit: dto.nit?.trim(),
        plan: dto.plan,
      },
      select: ORGANIZACION_SELECT,
    });
  }

  async listar({ page, limit }: PaginationQueryDto) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.organizacion.findMany({
        select: ORGANIZACION_SELECT,
        orderBy: { nombre: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.organizacion.count(),
    ]);

    const actividad = await this.ultimaActividad(data.map((org) => org.id));
    return paginate(
      data.map((org) => ({
        ...org,
        ultima_actividad: actividad.get(org.id) ?? null,
      })),
      total,
      page,
      limit,
    );
  }

  private async ultimaActividad(ids: number[]): Promise<Map<number, Date>> {
    if (ids.length === 0) return new Map();
    const usuarios = await this.prisma.usuario.findMany({
      where: {
        organizacion_id: { in: ids },
        seguridad_cuenta: { fecha_ultimo_login: { not: null } },
      },
      select: {
        organizacion_id: true,
        seguridad_cuenta: { select: { fecha_ultimo_login: true } },
      },
    });
    const ultima = new Map<number, Date>();
    for (const usuario of usuarios) {
      const fecha = usuario.seguridad_cuenta?.fecha_ultimo_login;
      if (!fecha || usuario.organizacion_id === null) continue;
      const previa = ultima.get(usuario.organizacion_id);
      if (!previa || fecha > previa) ultima.set(usuario.organizacion_id, fecha);
    }
    return ultima;
  }

  async obtener(id: number) {
    const organizacion = await this.prisma.organizacion.findUnique({
      where: { id },
      select: ORGANIZACION_SELECT,
    });
    if (!organizacion) {
      throw new NotFoundException('Organización no encontrada');
    }
    return organizacion;
  }

  async obtenerDetalle(id: number) {
    const organizacion = await this.prisma.organizacion.findUnique({
      where: { id },
      select: ORGANIZACION_DETALLE_SELECT,
    });
    if (!organizacion) {
      throw new NotFoundException('Organización no encontrada');
    }
    return organizacion;
  }

  async actualizar(id: number, dto: UpdateOrganizacionDto) {
    await this.obtener(id);
    return this.prisma.organizacion.update({
      where: { id },
      data: {
        nombre: dto.nombre?.trim(),
        nit: dto.nit?.trim(),
        plan: dto.plan,
      },
      select: ORGANIZACION_SELECT,
    });
  }

  async desactivar(id: number) {
    await this.obtener(id);

    try {
      await transaccionConPresupuesto(
        this.prisma,
        TOPE_ESPERA_ESCRITURA_MS,
        async (p) => {
          const usuarios = await p.paso(
            'bloquear usuarios de la organización',
            (tx) =>
              tx.$queryRaw<
                Array<{ id: number }>
              >`SELECT "id" FROM "usuarios" WHERE "organizacion_id" = ${id} ORDER BY "id" FOR NO KEY UPDATE`,
          );
          await p.paso('desactivar usuarios', (tx) =>
            tx.usuario.updateMany({
              where: { id: { in: usuarios.map((u) => u.id) }, activo: true },
              data: { activo: false },
            }),
          );
          await revocarSesionesDeLaOrganizacion(p, id);
          await revocarAsignacionesDeLaOrganizacion(p, id);
          await p.paso('desactivar granjas', (tx) =>
            tx.granja.updateMany({
              where: { organizacion_id: id, activa: true },
              data: { activa: false },
            }),
          );
          await p.paso('desactivar organización', (tx) =>
            tx.organizacion.update({
              where: { id },
              data: { activa: false },
            }),
          );
        },
      );
    } catch (error) {
      if (esEsperaVencida(error)) {
        throw new ConflictException(MENSAJE_ORGANIZACION_OCUPADA);
      }
      throw error;
    }
    return { id, activa: false };
  }

  async activar(id: number) {
    await this.obtener(id);
    await this.prisma.organizacion.update({
      where: { id },
      data: { activa: true },
    });
    return { id, activa: true };
  }

  async impactoEliminacion(id: number): Promise<ImpactoEliminacion> {
    const organizacion = await this.obtener(id);
    const granja = { organizacion_id: id };
    const galpon = { granja };
    const lote = { galpon };
    const [
      usuarios,
      granjas,
      galpones,
      lotes,
      dispositivos,
      sensores,
      mediciones,
      pesajes,
      mortalidad,
      consumos,
      sanitarios,
      plagas,
      alertas,
    ] = await this.prisma.$transaction([
      this.prisma.usuario.count({ where: { organizacion_id: id } }),
      this.prisma.granja.count({ where: granja }),
      this.prisma.galpon.count({ where: galpon }),
      this.prisma.lote.count({ where: lote }),
      this.prisma.dispositivo.count({ where: { galpon, retirado_en: null } }),
      this.prisma.sensor.count({ where: { galpon, ...SENSOR_VIGENTE } }),
      this.prisma.medicion.count({ where: { sensor: { galpon } } }),
      this.prisma.pesaje.count({ where: { lote } }),
      this.prisma.registroMortalidad.count({ where: { lote } }),
      this.prisma.consumoDiario.count({ where: { lote } }),
      this.prisma.eventoSanitario.count({ where: { lote } }),
      this.prisma.registroPlaga.count({ where: { lote } }),
      this.prisma.alerta.count({ where: { galpon } }),
    ]);
    return {
      organizacion: { id: organizacion.id, nombre: organizacion.nombre },
      usuarios,
      granjas,
      galpones,
      lotes,
      dispositivos,
      sensores,
      mediciones,
      registros: pesajes + mortalidad + consumos + sanitarios + plagas,
      alertas,
    };
  }

  /**
   * Borra la organización y todo lo que cuelga de ella, en una transacción.
   *
   * El orden va de las hojas a la raíz porque casi ninguna relación del
   * esquema borra en cascada. Lo que pertenece a otras organizaciones o a la
   * plataforma (prospectos, PQRS, curvas genéticas, auditoría) no se borra:
   * solo se le quita la referencia a los usuarios que desaparecen. La
   * auditoría conserva cada registro con el usuario anonimizado, y el propio
   * borrado queda auditado a nombre del administrador que lo hizo.
   */
  async eliminarDefinitivo(
    id: number,
    confirmacion: string,
    solicitanteId: number,
  ): Promise<ImpactoEliminacion & { eliminada: true }> {
    const impacto = await this.impactoEliminacion(id);
    if (confirmacion.trim() !== impacto.organizacion.nombre.trim()) {
      throw new BadRequestException(
        'La confirmación no coincide con el nombre de la organización.',
      );
    }
    const solicitante = await this.prisma.usuario.findUnique({
      where: { id: solicitanteId },
      select: { organizacion_id: true },
    });
    if (solicitante?.organizacion_id === id) {
      throw new ForbiddenException(
        'No puedes eliminar la organización a la que perteneces.',
      );
    }

    const granja = { organizacion_id: id };
    const galpon = { granja };
    const lote = { galpon };
    const usuario = { organizacion_id: id };
    const alerta: Prisma.AlertaWhereInput = {
      OR: [{ galpon }, { lote }, { sensor: { galpon } }],
    };
    const insumo = { granja };
    const orden: Prisma.OrdenCompraWhereInput = { OR: [{ granja }, { lote }] };
    const movimientoInventario: Prisma.MovimientoInventarioWhereInput = {
      OR: [{ insumo }, { lote }, { detalle_orden_compra: { orden } }],
    };

    try {
      await this.prisma.$transaction(
        async (tx) => {
          await tx.bitacoraAuditoria.updateMany({
            where: { usuario },
            data: { usuario_id: null },
          });
          await tx.prospecto.updateMany({
            where: { asesor: usuario },
            data: { asesor_asignado_id: null },
          });
          await tx.prospecto.updateMany({
            where: { usuario_convertido: usuario },
            data: { usuario_convertido_id: null },
          });
          await tx.solicitudPqrs.updateMany({
            where: { responsable: usuario },
            data: { responsable_id: null },
          });
          await tx.recuperacionPassword.updateMany({
            where: { atendida_por: usuario },
            data: { atendida_por_id: null },
          });
          await tx.curvaGeneticaVersion.updateMany({
            where: { publicada_por: usuario },
            data: { publicada_por_id: null },
          });
          await tx.alerta.updateMany({
            where: { responsable: usuario },
            data: { responsable_id: null },
          });
          await tx.alerta.updateMany({
            where: { escalado_a: usuario },
            data: { escalado_a_id: null },
          });
          await tx.evidenciaAlerta.updateMany({
            where: { usuario },
            data: { usuario_id: null },
          });
          await tx.accionamientoEquipo.updateMany({
            where: { usuario },
            data: { usuario_id: null },
          });
          await tx.mantenimiento.updateMany({
            where: { tecnico: usuario },
            data: { tecnico_id: null },
          });
          await tx.recomendacion.updateMany({
            where: { usuario },
            data: { usuario_id: null },
          });

          await tx.alertaCanal.deleteMany({ where: { alerta } });
          await tx.evidenciaAlerta.deleteMany({ where: { alerta } });
          await tx.accionamientoEquipo.deleteMany({
            where: { OR: [{ alerta }, { equipo: { galpon } }] },
          });
          await tx.alerta.deleteMany({ where: alerta });

          await tx.mantenimientoRepuesto.deleteMany({
            where: {
              OR: [
                { mantenimiento: { equipo: { galpon } } },
                { insumo },
                { movimiento_salida: movimientoInventario },
                { movimiento_reversion: movimientoInventario },
              ],
            },
          });
          await tx.mantenimiento.deleteMany({ where: { equipo: { galpon } } });

          await tx.recomendacion.deleteMany({
            where: { OR: [{ lote }, { galpon }, { prediccion: { lote } }] },
          });
          await tx.prediccion.deleteMany({ where: { lote } });
          await tx.pesaje.deleteMany({ where: { lote } });
          await tx.registroMortalidad.deleteMany({ where: { lote } });
          await tx.eventoSanitario.deleteMany({ where: { lote } });
          await tx.consumoDiario.deleteMany({ where: { lote } });
          await tx.registroPlaga.deleteMany({ where: { lote } });
          await tx.indicadorLote.deleteMany({ where: { lote } });
          await tx.analisisBioacustico.deleteMany({ where: { galpon } });
          await tx.analisisVision.deleteMany({ where: { galpon } });
          await tx.estimacionAlimentoPlan.deleteMany({
            where: { plan: { lote } },
          });
          await tx.planLote.deleteMany({ where: { lote } });

          await tx.movimientoFinanciero.deleteMany({
            where: { OR: [{ granja }, { lote }] },
          });
          await tx.movimientoInventario.deleteMany({
            where: movimientoInventario,
          });
          await tx.detalleOrdenCompra.deleteMany({
            where: { OR: [{ orden }, { insumo }] },
          });
          await tx.ordenCompra.deleteMany({ where: orden });

          await tx.medicion.deleteMany({ where: { sensor: { galpon } } });
          await tx.ingestaDispositivo.deleteMany({
            where: { dispositivo: { galpon } },
          });
          await tx.sensor.deleteMany({ where: { galpon } });
          await tx.dispositivo.deleteMany({ where: { galpon } });
          await tx.equipo.deleteMany({ where: { galpon } });
          await tx.umbralAmbiental.deleteMany({ where: { galpon } });
          await tx.usuarioGalpon.deleteMany({
            where: { OR: [{ galpon }, { usuario }] },
          });
          await tx.comandoVoz.deleteMany({
            where: { OR: [{ galpon }, { usuario }] },
          });
          await tx.zonaGalpon.deleteMany({ where: { galpon } });
          await tx.lote.deleteMany({ where: lote });
          await tx.galpon.deleteMany({ where: galpon });

          await tx.inventarioInsumo.deleteMany({ where: insumo });
          await tx.politicaAlerta.deleteMany({ where: { granja } });
          await tx.clima.deleteMany({ where: { granja } });
          await tx.granja.deleteMany({ where: granja });

          await tx.seguridadCuenta.deleteMany({ where: { usuario } });
          await tx.sesion.deleteMany({ where: { usuario } });
          await tx.recuperacionPassword.deleteMany({ where: { usuario } });
          await tx.notificacion.deleteMany({ where: { usuario } });
          await tx.mensajeIa.deleteMany({
            where: { conversacion: { usuario } },
          });
          await tx.conversacionIa.deleteMany({ where: { usuario } });
          await tx.usuario.deleteMany({ where: usuario });
          await tx.organizacion.delete({ where: { id } });
        },
        { maxWait: 10_000, timeout: TOPE_BORRADO_MS },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2003' || error.code === 'P2014')
      ) {
        throw new ConflictException(
          'No se pudo eliminar: alguno de sus usuarios tiene registros en otra organización. No se borró nada.',
        );
      }
      throw error;
    }

    return { ...impacto, eliminada: true };
  }
}
