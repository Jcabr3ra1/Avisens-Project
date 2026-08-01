import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IngestDto } from './dto/ingest.dto';
import type { DispositivoAutenticado } from '../../common/guards/device-token.guard';

// Fila lista para insertar en `mediciones`.
interface MedicionNueva {
  sensor_id: number;
  valor: number;
  calidad?: string;
}

@Injectable()
export class IngestService {
  constructor(private prisma: PrismaService) {}

  async registrar(
    dto: IngestDto,
    dispositivo: DispositivoAutenticado,
    ipPeticion?: string,
  ) {
    // Solo sensores que pertenecen a ESTE dispositivo: un nodo no puede escribir
    // en sensores ajenos aunque conozca su código.
    const codigos = dto.lecturas.map((l) => l.codigo);
    const sensores = await this.prisma.sensor.findMany({
      where: { dispositivo_id: dispositivo.id, codigo: { in: codigos } },
      select: { id: true, codigo: true },
    });
    const idPorCodigo = new Map(sensores.map((s) => [s.codigo, s.id]));

    // Separamos las lecturas resolubles de las de código desconocido/ajeno: una
    // lectura mal configurada no debe tumbar el resto del lote.
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
      });
    }

    // Una transacción: inserta las mediciones y marca el dispositivo "online"
    // (heartbeat). Si algo falla, no queda nada a medias.
    await this.prisma.$transaction([
      ...aInsertar.map((data) => this.prisma.medicion.create({ data })),
      this.prisma.dispositivo.update({
        where: { id: dispositivo.id },
        data: {
          estado: 'online',
          ultima_conexion: new Date(),
          ip_local: dto.ip_local ?? ipPeticion ?? undefined,
        },
      }),
    ]);

    return { registradas: aInsertar.length, ignoradas };
  }
}
