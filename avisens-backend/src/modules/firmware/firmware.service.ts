import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';

export const TAMANO_MAXIMO_FIRMWARE = 1_310_720;
const MAGIA_IMAGEN_ESP32 = 0xe9;
const VERSION_VALIDA = /^\d{1,3}\.\d{1,3}\.\d{1,3}$/;

const RESUMEN = {
  id: true,
  version: true,
  sha256: true,
  tamano: true,
  notas: true,
  vigente: true,
  fecha_creacion: true,
} as const;

@Injectable()
export class FirmwareService {
  constructor(private prisma: PrismaService) {}

  listar() {
    return this.prisma.firmwareVersion.findMany({
      select: RESUMEN,
      orderBy: { fecha_creacion: 'desc' },
    });
  }

  async subir(binario: unknown, version: unknown, notas: unknown) {
    if (!Buffer.isBuffer(binario) || binario.length === 0) {
      throw new BadRequestException(
        'Envía el archivo .bin del firmware como application/octet-stream',
      );
    }
    if (typeof version !== 'string' || !VERSION_VALIDA.test(version)) {
      throw new BadRequestException('La versión debe tener el formato 1.2.3');
    }
    if (binario.length > TAMANO_MAXIMO_FIRMWARE) {
      throw new BadRequestException(
        'El firmware no cabe en la partición de actualización del ESP32 (máximo 1,25 MB)',
      );
    }
    if (binario[0] !== MAGIA_IMAGEN_ESP32) {
      throw new BadRequestException(
        'El archivo no es una imagen de firmware de ESP32 (.bin de PlatformIO)',
      );
    }
    const existente = await this.prisma.firmwareVersion.findUnique({
      where: { version },
      select: { id: true },
    });
    if (existente) {
      throw new ConflictException(`La versión ${version} ya existe`);
    }
    return this.prisma.firmwareVersion.create({
      data: {
        version,
        sha256: createHash('sha256').update(binario).digest('hex'),
        tamano: binario.length,
        binario: new Uint8Array(binario),
        notas:
          typeof notas === 'string' && notas.trim()
            ? notas.trim().slice(0, 500)
            : null,
      },
      select: RESUMEN,
    });
  }

  async publicar(id: number) {
    await this.existente(id);
    return this.prisma.$transaction(async (tx) => {
      await tx.firmwareVersion.updateMany({
        where: { vigente: true, NOT: { id } },
        data: { vigente: false },
      });
      return tx.firmwareVersion.update({
        where: { id },
        data: { vigente: true },
        select: RESUMEN,
      });
    });
  }

  async retirarPublicacion(id: number) {
    await this.existente(id);
    return this.prisma.firmwareVersion.update({
      where: { id },
      data: { vigente: false },
      select: RESUMEN,
    });
  }

  async eliminar(id: number) {
    const version = await this.existente(id);
    if (version.vigente) {
      throw new ConflictException(
        'No se puede eliminar la versión publicada; publica otra o retírala primero',
      );
    }
    await this.prisma.firmwareVersion.delete({ where: { id } });
    return { id, eliminado: true };
  }

  vigente() {
    return this.prisma.firmwareVersion.findFirst({
      where: { vigente: true },
      select: { version: true, sha256: true, tamano: true },
    });
  }

  async binarioVigente() {
    const version = await this.prisma.firmwareVersion.findFirst({
      where: { vigente: true },
      select: { version: true, sha256: true, binario: true },
    });
    if (!version) throw new NotFoundException('No hay firmware publicado');
    return version;
  }

  private async existente(id: number) {
    const version = await this.prisma.firmwareVersion.findUnique({
      where: { id },
      select: { id: true, vigente: true },
    });
    if (!version)
      throw new NotFoundException('Versión de firmware no encontrada');
    return version;
  }
}
