import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { IngestDto } from './dto/ingest.dto';
import type { DispositivoAutenticado } from '../../common/guards/device-token.guard';
import { ObservabilityService } from '../../common/observability/observability.service';

interface MedicionNueva {
  sensor_id: number;
  valor: number;
  calidad?: string;
  fecha_hora: Date;
}

@Injectable()
export class IngestService {
  private readonly logger = new Logger(IngestService.name);

  constructor(
    private prisma: PrismaService,
    private observability: ObservabilityService,
  ) {}

  async registrar(
    dto: IngestDto,
    dispositivo: DispositivoAutenticado,
    ipPeticion?: string,
  ) {
    if (dto.id_lote) {
      const anterior = await this.prisma.ingestaDispositivo.findUnique({
        where: {
          dispositivo_id_clave_idempotencia: {
            dispositivo_id: dispositivo.id,
            clave_idempotencia: dto.id_lote,
          },
        },
      });
      if (anterior) {
        await this.actualizarHeartbeat(
          dispositivo.id,
          dto.ip_local ?? ipPeticion,
        );
        return this.respuestaDuplicada(anterior);
      }
    }

    const codigos = dto.lecturas.map((l) => l.codigo);
    const sensores = await this.prisma.sensor.findMany({
      where: {
        dispositivo_id: dispositivo.id,
        codigo: { in: codigos },
        estado: 'activo',
      },
      select: { id: true, codigo: true },
    });
    const idPorCodigo = new Map(sensores.map((s) => [s.codigo, s.id]));

    const fechaMedicion = dto.fecha_dispositivo
      ? new Date(dto.fecha_dispositivo)
      : new Date();
    const aInsertar: MedicionNueva[] = [];
    const ignoradas: string[] = [];
    for (const lectura of dto.lecturas) {
      const sensorId = idPorCodigo.get(lectura.codigo);
      if (sensorId === undefined) {
        ignoradas.push(lectura.codigo);
        continue;
      }
      aInsertar.push({
        sensor_id: sensorId,
        valor: lectura.valor,
        calidad: lectura.calidad,
        fecha_hora: fechaMedicion,
      });
    }

    const claveIdempotencia = dto.id_lote ?? `legacy-${randomUUID()}`;
    const ipOrigen = dto.ip_local ?? ipPeticion;

    try {
      await this.prisma.$transaction([
        this.prisma.ingestaDispositivo.create({
          data: {
            dispositivo_id: dispositivo.id,
            clave_idempotencia: claveIdempotencia,
            fecha_dispositivo: dto.fecha_dispositivo
              ? new Date(dto.fecha_dispositivo)
              : undefined,
            ip_origen: ipOrigen,
            cantidad_recibida: dto.lecturas.length,
            cantidad_registrada: aInsertar.length,
            codigos_ignorados: ignoradas,
          },
        }),
        this.prisma.medicion.createMany({ data: aInsertar }),
        this.operacionHeartbeat(dispositivo.id, ipOrigen),
      ]);
    } catch (error: unknown) {
      if (dto.id_lote && this.esConflictoUnico(error)) {
        const anterior = await this.prisma.ingestaDispositivo.findUnique({
          where: {
            dispositivo_id_clave_idempotencia: {
              dispositivo_id: dispositivo.id,
              clave_idempotencia: dto.id_lote,
            },
          },
        });
        if (anterior) {
          await this.actualizarHeartbeat(dispositivo.id, ipOrigen);
          return this.respuestaDuplicada(anterior);
        }
      }
      throw error;
    }

    this.logger.log(
      JSON.stringify({
        evento: 'iot.ingesta',
        dispositivo_id: dispositivo.id,
        lote: claveIdempotencia,
        recibidas: dto.lecturas.length,
        registradas: aInsertar.length,
        ignoradas: ignoradas.length,
      }),
    );
    this.observability.registrarIngesta(aInsertar.length);

    return {
      id_lote: claveIdempotencia,
      duplicada: false,
      registradas: aInsertar.length,
      ignoradas,
    };
  }

  private respuestaDuplicada(anterior: {
    clave_idempotencia: string;
    cantidad_registrada: number;
    codigos_ignorados: string[];
  }) {
    return {
      id_lote: anterior.clave_idempotencia,
      duplicada: true,
      registradas: anterior.cantidad_registrada,
      ignoradas: anterior.codigos_ignorados,
    };
  }

  private operacionHeartbeat(dispositivoId: number, ip?: string) {
    return this.prisma.dispositivo.update({
      where: { id: dispositivoId },
      data: {
        estado: 'online',
        ultima_conexion: new Date(),
        ip_local: ip,
      },
    });
  }

  private async actualizarHeartbeat(dispositivoId: number, ip?: string) {
    await this.operacionHeartbeat(dispositivoId, ip);
  }

  private esConflictoUnico(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }
}
