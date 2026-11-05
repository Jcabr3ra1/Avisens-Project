import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  PayloadTooLargeException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import type { DispositivoAutenticado } from '../../../common/guards/device-token.guard';
import { PrismaService } from '../../../prisma/prisma.service';
import { AlertasService } from '../../alertas/alertas.service';
import { ClienteMlService } from '../../predicciones/cliente-ml.service';
import {
  Deteccion,
  EstadoAnterior,
  PolloSeguido,
  seguirPollos,
} from './seguimiento';

export const TIPO_DETECCION_POLLOS = 'deteccion_pollos';
const MAX_BYTES_FOTO = 2 * 1024 * 1024;

interface RespuestaMl {
  modelo: string;
  ancho: number;
  alto: number;
  conteo: number;
  detecciones: Deteccion[];
  duracion_ms: number;
}

// Lo que queda guardado en analisis_vision.resultado: alcanza para dibujar
// la foto con sus recuadros y para seguir a los pollos en la siguiente.
export interface ResultadoDeteccionPollos {
  modelo: string;
  ancho: number;
  alto: number;
  conteo: number;
  quietos: number;
  posibles_muertos: number;
  siguiente_id: number;
  umbrales: { quieto_min: number; muerto_min: number };
  duracion_ms: number;
  pollos: PolloSeguido[];
}

function esJpeg(datos: Buffer) {
  return datos.length > 3 && datos[0] === 0xff && datos[1] === 0xd8;
}

function esRespuestaMl(v: unknown): v is RespuestaMl {
  const r = v as RespuestaMl;
  return (
    typeof r === 'object' &&
    r !== null &&
    typeof r.ancho === 'number' &&
    typeof r.alto === 'number' &&
    Array.isArray(r.detecciones)
  );
}

@Injectable()
export class VisionIngestService {
  private readonly logger = new Logger(VisionIngestService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private clienteMl: ClienteMlService,
    private alertas: AlertasService,
  ) {}

  private numero(clave: string, porDefecto: number) {
    const valor = Number(this.config.get<string>(clave));
    return Number.isFinite(valor) && valor > 0 ? valor : porDefecto;
  }

  async registrarFoto(dispositivo: DispositivoAutenticado, foto: unknown) {
    if (!Buffer.isBuffer(foto) || foto.length === 0) {
      throw new BadRequestException(
        'Envía la foto en el cuerpo con Content-Type image/jpeg',
      );
    }
    if (foto.length > MAX_BYTES_FOTO) {
      throw new PayloadTooLargeException('La foto supera 2 MB');
    }
    if (!esJpeg(foto)) {
      throw new UnprocessableEntityException('La foto no es un JPEG');
    }

    const quietoMin = this.numero('VISION_QUIETO_MIN', 5);
    const muertoMin = this.numero('VISION_MUERTO_MIN', 60);
    const confianza = Math.min(this.numero('VISION_CONFIANZA', 0.4), 0.95);

    const deteccion = await this.detectar(foto, confianza);
    const ahora = new Date();

    const previo = await this.prisma.analisisVision.findFirst({
      where: { galpon_id: dispositivo.galpon_id, tipo_analisis: TIPO_DETECCION_POLLOS },
      orderBy: { fecha_hora: 'desc' },
      select: { fecha_hora: true, resultado: true },
    });
    const resultadoPrevio = previo?.resultado as ResultadoDeteccionPollos | null;
    const anterior: EstadoAnterior | null =
      previo && resultadoPrevio?.pollos
        ? {
            fecha: previo.fecha_hora,
            pollos: resultadoPrevio.pollos,
            siguienteId: resultadoPrevio.siguiente_id ?? 1,
          }
        : null;

    const seguimiento = seguirPollos(anterior, deteccion.detecciones, ahora, {
      quietoMin,
      muertoMin,
      // La cámara manda cada 10-60 s: 15 min sin fotos ya no es "la anterior".
      olvidarSeg: this.numero('VISION_OLVIDAR_SEG', 900),
    });

    const resultado: ResultadoDeteccionPollos = {
      modelo: deteccion.modelo,
      ancho: deteccion.ancho,
      alto: deteccion.alto,
      conteo: seguimiento.pollos.length,
      quietos: seguimiento.quietos,
      posibles_muertos: seguimiento.posiblesMuertos,
      siguiente_id: seguimiento.siguienteId,
      umbrales: { quieto_min: quietoMin, muerto_min: muertoMin },
      duracion_ms: deteccion.duracion_ms,
      pollos: seguimiento.pollos,
    };

    const lote = await this.prisma.lote.findFirst({
      where: { galpon_id: dispositivo.galpon_id, estado: 'activo' },
      select: { id: true },
    });
    const conAlerta = seguimiento.posiblesMuertos > 0;

    const analisis = await this.prisma.$transaction(async (tx) => {
      const creado = await tx.analisisVision.create({
        data: {
          galpon_id: dispositivo.galpon_id,
          lote_id: lote?.id,
          fecha_hora: ahora,
          tipo_analisis: TIPO_DETECCION_POLLOS,
          resultado: resultado as unknown as Prisma.InputJsonValue,
        },
        select: { id: true },
      });
      await tx.capturaVision.create({
        data: {
          analisis_id: creado.id,
          galpon_id: dispositivo.galpon_id,
          dispositivo_id: dispositivo.id,
          imagen: new Uint8Array(foto),
          tamano: foto.length,
          con_alerta: conAlerta,
          fecha_hora: ahora,
        },
      });
      await tx.dispositivo.update({
        where: { id: dispositivo.id },
        data: { estado: 'online', ultima_conexion: ahora },
      });
      return creado;
    });

    if (conAlerta) {
      await this.alertas.registrarAlertaVision(
        dispositivo.galpon_id,
        lote?.id ?? null,
        seguimiento.posiblesMuertos,
        muertoMin,
      );
    }
    await this.podar(dispositivo.galpon_id);

    return {
      analisis_id: analisis.id,
      conteo: resultado.conteo,
      quietos: resultado.quietos,
      posibles_muertos: resultado.posibles_muertos,
      duracion_ms: resultado.duracion_ms,
    };
  }

  private async detectar(foto: Buffer, confianza: number): Promise<RespuestaMl> {
    const respuesta = await this.clienteMl.llamarBinario(
      `/vision/detectar?confianza=${confianza}`,
      foto,
      'image/jpeg',
    );
    if (!respuesta) {
      throw new BadGatewayException('El servicio de análisis no respondió');
    }
    if (respuesta.status === 422) {
      throw new UnprocessableEntityException('El servicio de análisis no pudo leer la foto');
    }
    const cuerpo = await this.clienteMl.leerJson(respuesta);
    if (!respuesta.ok || !esRespuestaMl(cuerpo)) {
      this.logger.warn(`El servicio ML respondió ${respuesta.status} a /vision/detectar`);
      throw new BadGatewayException('El servicio de análisis falló');
    }
    return cuerpo;
  }

  // Una foto cada 10 s son ~8.600 al día: se conservan las últimas N por
  // galpón y las que dispararon alerta. Los resultados (sin foto) se borran
  // pasados VISION_RETENCION_DIAS, y con ellos sus fotos de alerta.
  private async podar(galponId: number) {
    try {
      const maxCapturas = this.numero('VISION_MAX_CAPTURAS', 200);
      const sobrantes = await this.prisma.capturaVision.findMany({
        where: { galpon_id: galponId, con_alerta: false },
        orderBy: { fecha_hora: 'desc' },
        skip: maxCapturas,
        select: { id: true },
      });
      if (sobrantes.length) {
        await this.prisma.capturaVision.deleteMany({
          where: { id: { in: sobrantes.map((c) => c.id) } },
        });
      }
      const dias = this.numero('VISION_RETENCION_DIAS', 7);
      await this.prisma.analisisVision.deleteMany({
        where: {
          galpon_id: galponId,
          tipo_analisis: TIPO_DETECCION_POLLOS,
          fecha_hora: { lt: new Date(Date.now() - dias * 86_400_000) },
        },
      });
    } catch (error) {
      // Podar es mantenimiento: si falla, la foto ya quedó guardada.
      this.logger.warn(`No se pudo podar capturas de visión: ${String(error)}`);
    }
  }
}
