import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JobCoordinatorService {
  private readonly logger = new Logger(JobCoordinatorService.name);
  private readonly propietario = randomUUID();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async ejecutar(
    nombre: string,
    claveVentana: string,
    tarea: () => Promise<void>,
    ttlMs: number,
  ): Promise<boolean> {
    if (this.config.get<string>('JOBS_ENABLED', 'true') === 'false') {
      this.logger.debug(`Job ${nombre} deshabilitado por configuración`);
      return false;
    }

    const ejecucion = await this.reclamar(nombre, claveVentana, ttlMs);
    if (!ejecucion) {
      this.logger.debug(`Job ${nombre}/${claveVentana} ya fue reclamado`);
      return false;
    }

    const inicio = Date.now();
    try {
      await tarea();
      await this.prisma.ejecucionJob.updateMany({
        where: { id: ejecucion.id, propietario: this.propietario },
        data: {
          estado: 'completado',
          finalizada_en: new Date(),
          error: null,
        },
      });
      this.logger.log(
        JSON.stringify({
          evento: 'job.completado',
          nombre,
          ventana: claveVentana,
          duracion_ms: Date.now() - inicio,
        }),
      );
      return true;
    } catch (error: unknown) {
      const mensaje = error instanceof Error ? error.message : String(error);
      await this.prisma.ejecucionJob.updateMany({
        where: { id: ejecucion.id, propietario: this.propietario },
        data: {
          estado: 'fallido',
          finalizada_en: new Date(),
          error: mensaje.slice(0, 2000),
        },
      });
      this.logger.error(
        JSON.stringify({
          evento: 'job.fallido',
          nombre,
          ventana: claveVentana,
          duracion_ms: Date.now() - inicio,
          error: mensaje,
        }),
      );
      return true;
    }
  }

  private async reclamar(nombre: string, claveVentana: string, ttlMs: number) {
    const ahora = new Date();
    const expiraEn = new Date(ahora.getTime() + ttlMs);

    try {
      return await this.prisma.ejecucionJob.create({
        data: {
          nombre,
          clave_ventana: claveVentana,
          propietario: this.propietario,
          expira_en: expiraEn,
        },
        select: { id: true },
      });
    } catch (error: unknown) {
      if (!this.esConflictoUnico(error)) throw error;
    }

    const recuperada = await this.prisma.ejecucionJob.updateMany({
      where: {
        nombre,
        clave_ventana: claveVentana,
        OR: [
          { expira_en: { lt: ahora } },
          { estado: 'fallido', intentos: { lt: 3 } },
        ],
      },
      data: {
        propietario: this.propietario,
        estado: 'ejecutando',
        intentos: { increment: 1 },
        iniciada_en: ahora,
        expira_en: expiraEn,
        finalizada_en: null,
        error: null,
      },
    });
    if (recuperada.count === 0) return null;

    return this.prisma.ejecucionJob.findUnique({
      where: { nombre_clave_ventana: { nombre, clave_ventana: claveVentana } },
      select: { id: true },
    });
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
