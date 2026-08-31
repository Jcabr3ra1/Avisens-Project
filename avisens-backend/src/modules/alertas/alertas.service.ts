// alertas.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAlertasDto } from './dto/create-alertas.dto';
import { UpdateAlertasDto } from './dto/update-alertas.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';
import { ROLES } from '../../common/auth/roles';
import type { Solicitante } from '../../common/auth/acceso';
import {
  filtroAlertas,
  verificarAccesoGalpon,
  verificarAccesoLote,
  verificarAccesoSensor,
} from '../../common/auth/alcance';

const ALERTA_SELECT = {
  id: true,
  galpon_id: true,
  lote_id: true,
  sensor_id: true,
  tipo: true,
  criticidad: true,
  valor_detectado: true,
  valor_umbral: true,
  mensaje: true,
  estado: true,
  responsable_id: true,
  escalado_a_id: true,
  accion_correctiva: true,
  fecha_creacion: true,
  fecha_aceptacion: true,
  fecha_cierre: true,
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
  lote: {
    select: {
      id: true,
      codigo: true,
      estado: true,
    },
  },
  sensor: {
    select: {
      id: true,
      codigo: true,
      tipo: true,
    },
  },
  responsable: {
    select: {
      id: true,
      nombre_completo: true,
      email: true,
    },
  },
  escalado_a: {
    select: {
      id: true,
      nombre_completo: true,
      email: true,
    },
  },
} as const;

@Injectable()
export class AlertasService {
  constructor(private prisma: PrismaService) {}

  async evaluarLectura(sensorId: number, valor: number, fecha = new Date()) {
    const sensor = await this.prisma.sensor.findUnique({
      where: { id: sensorId },
      select: {
        id: true,
        tipo: true,
        galpon_id: true,
        galpon: {
          select: {
            nombre: true,
            granja: { select: { propietario_id: true } },
            lotes: {
              where: { estado: 'activo' },
              select: { id: true, fecha_ingreso: true },
              orderBy: { fecha_ingreso: 'desc' },
              take: 1,
            },
          },
        },
      },
    });
    if (!sensor) return null;

    const variable = this.normalizarVariable(sensor.tipo);
    if (!variable) return null;

    const loteActivo = sensor.galpon.lotes[0] ?? null;
    const semanaVida = loteActivo
      ? Math.max(
          0,
          Math.floor(
            (fecha.getTime() - loteActivo.fecha_ingreso.getTime()) /
              (7 * 24 * 60 * 60 * 1000),
          ),
        )
      : 0;
    const umbral = await this.prisma.umbralAmbiental.findFirst({
      where: {
        galpon_id: sensor.galpon_id,
        variable,
        semana_vida: semanaVida,
        vigente: true,
      },
      select: {
        valor_minimo: true,
        valor_maximo: true,
      },
    });
    if (!umbral || this.estaEnRango(valor, umbral.valor_minimo, umbral.valor_maximo)) {
      return null;
    }

    const existente = await this.prisma.alerta.findFirst({
      where: {
        sensor_id: sensor.id,
        estado: { in: ['abierta', 'en_proceso'] },
      },
      select: { id: true },
    });
    if (existente) {
      return this.prisma.alerta.update({
        where: { id: existente.id },
        data: { valor_detectado: valor },
        select: ALERTA_SELECT,
      });
    }

    const criticidad = this.calcularCriticidad(
      valor,
      umbral.valor_minimo,
      umbral.valor_maximo,
    );
    const alerta = await this.prisma.alerta.create({
      data: {
        galpon_id: sensor.galpon_id,
        lote_id: loteActivo?.id,
        sensor_id: sensor.id,
        tipo: sensor.tipo,
        criticidad,
        valor_detectado: valor,
        valor_umbral:
          valor > umbral.valor_maximo
            ? umbral.valor_maximo
            : umbral.valor_minimo,
        mensaje: `${sensor.tipo} fuera del rango seguro en ${sensor.galpon.nombre}.`,
      },
      select: ALERTA_SELECT,
    });
    await this.notificarNuevaAlerta(
      alerta.id,
      sensor.galpon.granja.propietario_id,
      sensor.galpon_id,
      alerta.mensaje ?? 'Hay una alerta por revisar.',
      criticidad,
    );
    return alerta;
  }

  private normalizarVariable(tipo: string) {
    const valor = tipo.toLowerCase();
    if (valor.includes('temp')) return 'temperatura';
    if (valor.includes('hum')) return 'humedad';
    if (valor.includes('luz') || valor.includes('lum')) return 'luminosidad';
    return null;
  }

  private estaEnRango(valor: number, minimo: number, maximo: number) {
    return valor >= minimo && valor <= maximo;
  }

  private calcularCriticidad(valor: number, minimo: number, maximo: number) {
    const rango = Math.max(maximo - minimo, maximo, 1);
    const distancia = valor > maximo ? valor - maximo : minimo - valor;
    return distancia <= rango * 0.15 ? 'media' : 'alta';
  }

  private async notificarNuevaAlerta(
    alertaId: number,
    propietarioId: number,
    galponId: number,
    mensaje: string,
    criticidad: string,
  ) {
    const asignaciones = await this.prisma.usuarioGalpon.findMany({
      where: {
        galpon_id: galponId,
        activa: true,
        usuario: { activo: true, rol: { nombre: ROLES.OPERARIO } },
      },
      select: { usuario_id: true },
    });
    const destinatarios = new Set([
      propietarioId,
      ...asignaciones.map(({ usuario_id }) => usuario_id),
    ]);
    await this.prisma.notificacion.createMany({
      data: [...destinatarios].map((usuario_id) => ({
        usuario_id,
        tipo: 'alerta',
        titulo: criticidad === 'alta' ? 'Alerta crítica' : 'Alerta por revisar',
        mensaje,
        referencia_tipo: 'alerta',
        referencia_id: alertaId,
      })),
    });
  }

  // ============================================================
  // VALIDACIONES PRIVADAS
  // ============================================================

  private async validarGalpon(galponId: number, solicitante: Solicitante) {
    const galpon = await this.prisma.galpon.findUnique({
      where: { id: galponId },
      include: { granja: true },
    });

    if (!galpon) {
      throw new NotFoundException('Galpón no encontrado');
    }

    await verificarAccesoGalpon(
      this.prisma,
      galponId,
      solicitante,
      'Solo puedes gestionar alertas de tus propias granjas',
      galpon.granja.propietario_id,
    );

    return galpon;
  }

  private async validarLote(loteId: number, solicitante: Solicitante) {
    const lote = await this.prisma.lote.findUnique({
      where: { id: loteId },
      include: {
        galpon: {
          include: { granja: true },
        },
      },
    });

    if (!lote) {
      throw new NotFoundException('Lote no encontrado');
    }

    await verificarAccesoLote(
      this.prisma,
      loteId,
      solicitante,
      'Solo puedes gestionar alertas de tus propias granjas',
      lote.galpon.granja.propietario_id,
    );

    return lote;
  }

  private async validarSensor(sensorId: number, solicitante: Solicitante) {
    const sensor = await this.prisma.sensor.findUnique({
      where: { id: sensorId },
      include: {
        galpon: {
          include: { granja: true },
        },
      },
    });

    if (!sensor) {
      throw new NotFoundException('Sensor no encontrado');
    }

    await verificarAccesoSensor(
      this.prisma,
      sensorId,
      solicitante,
      'Solo puedes gestionar alertas de tus propias granjas',
      sensor.galpon.granja.propietario_id,
    );

    return sensor;
  }

  private async validarUsuario(userId: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, nombre_completo: true, email: true },
    });

    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }

    return usuario;
  }

  // ============================================================
  // MÉTODOS PÚBLICOS
  // ============================================================

  async crear(dto: CreateAlertasDto, solicitante: Solicitante) {
    await this.validarGalpon(dto.galpon_id, solicitante);

    if (dto.lote_id) {
      await this.validarLote(dto.lote_id, solicitante);
    }

    if (dto.sensor_id) {
      await this.validarSensor(dto.sensor_id, solicitante);
    }

    return this.prisma.alerta.create({
      data: {
        galpon_id: dto.galpon_id,
        lote_id: dto.lote_id,
        sensor_id: dto.sensor_id,
        tipo: dto.tipo,
        criticidad: dto.criticidad,
        valor_detectado: dto.valor_detectado,
        valor_umbral: dto.valor_umbral,
        mensaje: dto.mensaje,
      },
      select: ALERTA_SELECT,
    });
  }

  async listar(solicitante: Solicitante, { page, limit }: PaginationQueryDto) {
    const where = filtroAlertas(solicitante) ?? {};

    const [data, total] = await this.prisma.$transaction([
      this.prisma.alerta.findMany({
        where,
        select: ALERTA_SELECT,
        orderBy: { fecha_creacion: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.alerta.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async obtener(id: number, solicitante: Solicitante) {
    const alerta = await this.prisma.alerta.findUnique({
      where: { id },
      select: ALERTA_SELECT,
    });

    if (!alerta) {
      throw new NotFoundException('Alerta no encontrada');
    }

    await verificarAccesoGalpon(
      this.prisma,
      alerta.galpon_id,
      solicitante,
      'No tienes acceso a esta alerta',
      alerta.galpon.granja.propietario_id,
    );

    return alerta;
  }

  /**
   * ACTUALIZAR ALERTA - CORREGIDO
   */
  async actualizar(
    id: number,
    dto: UpdateAlertasDto,
    solicitante: Solicitante,
  ) {
    // Verificar que existe y el usuario tiene acceso
    await this.obtener(id, solicitante);

    const data: Prisma.AlertaUncheckedUpdateInput = {};

    // Validar y asignar responsable_id
    if (dto.responsable_id !== undefined) {
      if (dto.responsable_id === null) {
        // Permitir desasignar responsable
        data.responsable_id = null;
      } else {
        // Validar que el usuario existe
        await this.validarUsuario(dto.responsable_id);
        data.responsable_id = dto.responsable_id;
      }
    }

    // Validar y asignar escalado_a_id
    if (dto.escalado_a_id !== undefined) {
      if (dto.escalado_a_id === null) {
        // Permitir desasignar escalado
        data.escalado_a_id = null;
      } else {
        // Validar que el usuario existe
        await this.validarUsuario(dto.escalado_a_id);
        data.escalado_a_id = dto.escalado_a_id;
      }
    }

    // Asignar otros campos
    if (dto.estado !== undefined) {
      data.estado = dto.estado;
    }

    if (dto.accion_correctiva !== undefined) {
      data.accion_correctiva = dto.accion_correctiva;
    }

    if (dto.fecha_aceptacion !== undefined) {
      data.fecha_aceptacion = dto.fecha_aceptacion
        ? new Date(dto.fecha_aceptacion)
        : null;
    }

    if (dto.fecha_cierre !== undefined) {
      data.fecha_cierre = dto.fecha_cierre ? new Date(dto.fecha_cierre) : null;
    }

    // Si no hay datos para actualizar, retornar la alerta existente
    if (Object.keys(data).length === 0) {
      return this.obtener(id, solicitante);
    }

    return this.prisma.alerta.update({
      where: { id },
      data,
      select: ALERTA_SELECT,
    });
  }

  async aceptar(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante);

    return this.prisma.alerta.update({
      where: { id },
      data: {
        estado: 'en_proceso',
        responsable_id: solicitante.id,
        fecha_aceptacion: new Date(),
      },
      select: ALERTA_SELECT,
    });
  }

  async cerrar(
    id: number,
    dto: { accion_correctiva: string },
    solicitante: Solicitante,
  ) {
    await this.obtener(id, solicitante);

    return this.prisma.alerta.update({
      where: { id },
      data: {
        estado: 'cerrada',
        accion_correctiva: dto.accion_correctiva,
        fecha_cierre: new Date(),
      },
      select: ALERTA_SELECT,
    });
  }

  async escalar(id: number, escalado_a_id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante);

    // Validar que el usuario a escalar existe
    await this.validarUsuario(escalado_a_id);

    return this.prisma.alerta.update({
      where: { id },
      data: {
        escalado_a_id,
        estado: 'en_proceso',
      },
      select: ALERTA_SELECT,
    });
  }

  async eliminar(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante);

    await this.prisma.alerta.delete({ where: { id } });
    return { id, eliminado: true };
  }

  async obtenerEstadisticas(solicitante: Solicitante) {
    const where = filtroAlertas(solicitante) ?? {};

    const [total, abiertas, enProceso, cerradas, criticas] = await Promise.all([
      this.prisma.alerta.count({ where }),
      this.prisma.alerta.count({ where: { ...where, estado: 'abierta' } }),
      this.prisma.alerta.count({ where: { ...where, estado: 'en_proceso' } }),
      this.prisma.alerta.count({ where: { ...where, estado: 'cerrada' } }),
      this.prisma.alerta.count({ where: { ...where, criticidad: 'critica' } }),
    ]);

    return {
      total,
      abiertas,
      en_proceso: enProceso,
      cerradas,
      criticas,
      tasa_resolucion: total > 0 ? (cerradas / total) * 100 : 0,
    };
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
      this.prisma.alerta.findMany({
        where,
        select: ALERTA_SELECT,
        orderBy: { fecha_creacion: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.alerta.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async obtenerPorLote(
    loteId: number,
    solicitante: Solicitante,
    paginacion: PaginationQueryDto,
  ) {
    const { page, limit } = paginacion;

    await this.validarLote(loteId, solicitante);

    const where = { lote_id: loteId };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.alerta.findMany({
        where,
        select: ALERTA_SELECT,
        orderBy: { fecha_creacion: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.alerta.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }
}
