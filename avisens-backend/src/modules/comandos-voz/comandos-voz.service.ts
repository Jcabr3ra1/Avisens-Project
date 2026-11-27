import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Solicitante } from '../../common/auth/acceso';
import { verificarAccesoGalpon } from '../../common/auth/alcance';
import { paginate } from '../../common/pagination/paginate';
import type { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { InterpretarComandoVozDto } from './dto/interpretar-comando-voz.dto';
import { SincronizarComandosVozDto } from './dto/sincronizar-comandos-voz.dto';

type IntencionVoz =
  | 'consultar_temperatura'
  | 'consultar_humedad'
  | 'consultar_ambiente'
  | 'accion_no_autorizada'
  | 'desconocido';

@Injectable()
export class ComandosVozService {
  constructor(private readonly prisma: PrismaService) {}

  async interpretar(dto: InterpretarComandoVozDto, usuario: Solicitante) {
    if (dto.modo_conexion === 'offline' && !dto.id_sincronizacion) {
      throw new BadRequestException(
        'Un comando offline requiere id_sincronizacion para evitar duplicados',
      );
    }
    if (dto.id_sincronizacion) {
      const anterior = await this.buscarSincronizacion(
        usuario.id,
        dto.id_sincronizacion,
      );
      if (anterior) return { ...anterior, duplicado: true };
    }

    await this.validarGalpon(dto.galpon_id, usuario);
    const interpretacion = this.clasificar(dto.comando_texto);
    const lecturas = interpretacion.consulta
      ? await this.consultarAmbiente(dto.galpon_id, interpretacion.intencion)
      : [];

    let comando;
    try {
      comando = await this.prisma.comandoVoz.create({
        data: {
          usuario_id: usuario.id,
          galpon_id: dto.galpon_id,
          id_sincronizacion: dto.id_sincronizacion,
          comando_texto: dto.comando_texto.trim(),
          tipo_comando: interpretacion.intencion,
          accion_ejecutada: interpretacion.consulta
            ? 'consulta_ambiental'
            : undefined,
          confianza_nlu: interpretacion.confianza,
          requiere_clarificacion: interpretacion.requiereClarificacion,
          modo_conexion: dto.modo_conexion ?? 'online',
          sincronizado: true,
          fecha_ejecucion: dto.fecha_ejecucion
            ? new Date(dto.fecha_ejecucion)
            : undefined,
        },
      });
    } catch (error) {
      if (
        dto.id_sincronizacion &&
        error instanceof Error &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        const anterior = await this.buscarSincronizacion(
          usuario.id,
          dto.id_sincronizacion,
        );
        if (anterior) return { ...anterior, duplicado: true };
      }
      throw error;
    }

    return {
      ...comando,
      duplicado: false,
      mensaje: interpretacion.mensaje,
      lecturas,
    };
  }

  async sincronizar(dto: SincronizarComandosVozDto, usuario: Solicitante) {
    if (dto.comandos.some((comando) => !comando.id_sincronizacion)) {
      throw new BadRequestException(
        'Cada comando offline requiere id_sincronizacion para evitar duplicados',
      );
    }
    const resultados = [];
    for (const comando of dto.comandos) {
      resultados.push(
        await this.interpretar(
          { ...comando, modo_conexion: 'offline' },
          usuario,
        ),
      );
    }
    return { procesados: resultados.length, resultados };
  }

  async historial(usuario: Solicitante, { page, limit }: PaginationQueryDto) {
    const where = { usuario_id: usuario.id };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.comandoVoz.findMany({
        where,
        orderBy: { fecha_ejecucion: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.comandoVoz.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  private async validarGalpon(galponId: number, usuario: Solicitante) {
    const galpon = await this.prisma.galpon.findUnique({
      where: { id: galponId },
      select: { id: true, granja: { select: { propietario_id: true } } },
    });
    if (!galpon) throw new NotFoundException('Galpón no encontrado');
    await verificarAccesoGalpon(
      this.prisma,
      galponId,
      usuario,
      'No tienes acceso al galpón indicado',
      galpon.granja.propietario_id,
    );
  }

  private buscarSincronizacion(usuarioId: number, idSincronizacion: string) {
    return this.prisma.comandoVoz.findUnique({
      where: {
        usuario_id_id_sincronizacion: {
          usuario_id: usuarioId,
          id_sincronizacion: idSincronizacion,
        },
      },
    });
  }

  private clasificar(texto: string) {
    const normalizado = texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    const esAccion =
      /\b(enciende|encender|apaga|apagar|abre|abrir|cierra|cerrar|registra|registrar|elimina|eliminar|borra|borrar)\b/.test(
        normalizado,
      );
    if (esAccion) {
      return this.resultado(
        'accion_no_autorizada',
        0.95,
        true,
        false,
        'Por seguridad, los comandos que modifican equipos o datos requieren confirmación en la aplicación.',
      );
    }

    const temperatura = /\b(temperatura|calor|grados?)\b/.test(normalizado);
    const humedad = /\b(humedad|humedo)\b/.test(normalizado);
    if (temperatura && humedad) {
      return this.resultado(
        'consultar_ambiente',
        0.98,
        false,
        true,
        'Estas son las últimas lecturas ambientales disponibles.',
      );
    }
    if (temperatura) {
      return this.resultado(
        'consultar_temperatura',
        0.95,
        false,
        true,
        'Esta es la última temperatura disponible.',
      );
    }
    if (humedad) {
      return this.resultado(
        'consultar_humedad',
        0.95,
        false,
        true,
        'Esta es la última humedad disponible.',
      );
    }
    return this.resultado(
      'desconocido',
      0,
      true,
      false,
      'No entendí el comando. Puedes consultar temperatura o humedad.',
    );
  }

  private resultado(
    intencion: IntencionVoz,
    confianza: number,
    requiereClarificacion: boolean,
    consulta: boolean,
    mensaje: string,
  ) {
    return { intencion, confianza, requiereClarificacion, consulta, mensaje };
  }

  private consultarAmbiente(galponId: number, intencion: IntencionVoz) {
    const tipos =
      intencion === 'consultar_temperatura'
        ? ['temperatura']
        : intencion === 'consultar_humedad'
          ? ['humedad']
          : ['temperatura', 'humedad'];
    return this.prisma.medicion.findMany({
      where: {
        sensor: {
          galpon_id: galponId,
          estado: 'activo',
          OR: tipos.map((tipo) => ({
            tipo: { contains: tipo, mode: 'insensitive' as const },
          })),
        },
      },
      select: {
        valor: true,
        fecha_hora: true,
        calidad: true,
        sensor: {
          select: { id: true, codigo: true, tipo: true, unidad_medida: true },
        },
      },
      distinct: ['sensor_id'],
      orderBy: { fecha_hora: 'desc' },
      take: 20,
    });
  }
}
