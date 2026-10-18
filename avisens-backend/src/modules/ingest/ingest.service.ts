import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { IngestDto } from './dto/ingest.dto';
import type { DispositivoAutenticado } from '../../common/guards/device-token.guard';
import { ObservabilityService } from '../../common/observability/observability.service';
import { AlertasService } from '../alertas/alertas.service';
import { clasificarFalloAlerta } from '../../common/errores/clasificar-error';
import { GPIO_DHT22 } from '../sensores/conexion-sensor';
import { FirmwareService } from '../firmware/firmware.service';

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
    private alertas: AlertasService,
    private firmware: FirmwareService,
  ) {}

  async configuracion(
    dispositivo: DispositivoAutenticado,
    versionFirmware?: string,
  ) {
    if (versionFirmware && /^[\w.-]{1,32}$/.test(versionFirmware)) {
      await this.prisma.dispositivo.updateMany({
        where: {
          id: dispositivo.id,
          OR: [
            { version_firmware: null },
            { version_firmware: { not: versionFirmware } },
          ],
        },
        data: { version_firmware: versionFirmware },
      });
    }
    const sensores = await this.prisma.sensor.findMany({
      where: {
        dispositivo_id: dispositivo.id,
        galpon_id: dispositivo.galpon_id,
        estado: 'activo',
        canal: { not: null },
      },
      select: { tipo: true, canal: true, modelo: true },
      orderBy: { canal: 'asc' },
    });
    const conexiones = new Map<
      string,
      { canal: string; modelo: 'DHT22'; gpio: number }
    >();
    for (const sensor of sensores) {
      const pin = /^gpio:(\d+)$/.exec(sensor.canal ?? '');
      if (
        !pin ||
        !GPIO_DHT22.includes(Number(pin[1])) ||
        sensor.modelo?.toUpperCase() !== 'DHT22' ||
        !['temperatura', 'humedad'].includes(sensor.tipo)
      )
        continue;
      conexiones.set(sensor.canal!, {
        canal: sensor.canal!,
        modelo: 'DHT22',
        gpio: Number(pin[1]),
      });
    }
    return {
      version: 1,
      controlador: dispositivo.codigo_topic,
      conexiones: [...conexiones.values()],
      firmware: await this.firmware.vigente(),
    };
  }

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

    const sensores = await this.prisma.sensor.findMany({
      where: {
        dispositivo_id: dispositivo.id,
        galpon_id: dispositivo.galpon_id,
        estado: 'activo',
      },
      select: { id: true, codigo: true, tipo: true, canal: true },
    });
    const idPorCodigo = new Map(sensores.map((s) => [s.codigo, s.id]));
    const idPorConexion = new Map(
      sensores
        .filter((s) => s.canal !== null)
        .map((s) => [`${s.tipo}:${s.canal}`, s.id]),
    );

    const fechaMedicion = dto.fecha_dispositivo
      ? new Date(dto.fecha_dispositivo)
      : new Date();
    const aInsertar: MedicionNueva[] = [];
    const ignoradas: string[] = [];
    const incluidos = new Set<number>();
    for (const lectura of dto.lecturas) {
      const identidad = lectura.codigo ?? `${lectura.tipo}:${lectura.canal}`;
      const sensorId =
        lectura.codigo !== undefined
          ? idPorCodigo.get(lectura.codigo)
          : idPorConexion.get(identidad);
      if (sensorId === undefined) {
        ignoradas.push(identidad);
        continue;
      }
      if (incluidos.has(sensorId))
        throw new BadRequestException(
          'Un sensor no puede aparecer dos veces en el mismo lote',
        );
      incluidos.add(sensorId);
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
    const resultadosAlertas = await Promise.allSettled(
      aInsertar.map((medicion) =>
        this.alertas.evaluarLectura(
          medicion.sensor_id,
          medicion.valor,
          medicion.fecha_hora,
        ),
      ),
    );

    const sensoresConFallo: number[] = [];
    const porClasificacion: Record<string, number> = {};
    resultadosAlertas.forEach((resultado, indice) => {
      if (resultado.status !== 'rejected') return;
      sensoresConFallo.push(aInsertar[indice].sensor_id);
      const { clasificacion } = clasificarFalloAlerta(resultado.reason);
      porClasificacion[clasificacion] =
        (porClasificacion[clasificacion] ?? 0) + 1;
    });

    if (sensoresConFallo.length > 0) {
      this.logger.error(
        JSON.stringify({
          evento: 'iot.alerta.fallida',
          dispositivo_id: dispositivo.id,
          mediciones_guardadas: aInsertar.length,
          alertas_fallidas: sensoresConFallo.length,
          sensores: sensoresConFallo,
          clasificacion: porClasificacion,
        }),
      );
    }

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
