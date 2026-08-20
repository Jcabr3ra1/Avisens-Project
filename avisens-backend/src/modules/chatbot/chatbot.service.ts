import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { IniciarChatDto } from './dto/iniciar-chat.dto';
import { ResponderChatDto } from './dto/responder-chat.dto';
import { ChatbotNluService } from './chatbot.nlu.service';

const PRIMERA_PREGUNTA = 'A1';
const FIN = 'FIN';

const UMBRAL_CALIENTE = 12;
const UMBRAL_TIBIO = 7;

@Injectable()
export class ChatbotService {
  constructor(
    private prisma: PrismaService,
    private nlu: ChatbotNluService,
  ) {}

  async iniciar(dto: IniciarChatDto) {
    const prospecto = await this.prisma.prospecto.create({
      data: {
        sesion_id: randomUUID(),
        canal_origen: dto.canal_origen ?? 'web',
        pregunta_actual: PRIMERA_PREGUNTA,
        estado: 'en_proceso',
      },
    });

    const pregunta = await this.obtenerPregunta(PRIMERA_PREGUNTA);

    return {
      sesion_id: prospecto.sesion_id,
      pregunta: this.formatearPregunta(pregunta),
      finalizado: false,
      puntaje_total: null as number | null,
      clasificacion: null as string | null,
    };
  }

  async responder(dto: ResponderChatDto) {
    const prospecto = await this.prisma.prospecto.findUnique({
      where: { sesion_id: dto.sesion_id },
    });
    if (!prospecto) throw new NotFoundException('Sesion no encontrada');

    if (!prospecto.pregunta_actual || prospecto.pregunta_actual === FIN) {
      throw new BadRequestException('Esta conversacion ya termino');
    }

    const pregunta = await this.obtenerPregunta(prospecto.pregunta_actual);

    const interpretada = await this.nlu.interpretar(pregunta, dto.respuesta);
    const respuesta = interpretada ?? dto.respuesta;

    const valor = this.validarRespuesta(pregunta, respuesta);
    const puntaje = pregunta.puntua
      ? await this.puntajeDe(pregunta.codigo, respuesta)
      : null;

    await this.prisma.respuestaChatbot.create({
      data: {
        prospecto_id: prospecto.id,
        pregunta_id: pregunta.id,
        bloque: pregunta.bloque,
        codigo_pregunta: pregunta.codigo,
        pregunta_texto: pregunta.texto,
        respuesta_texto: respuesta,
        puntaje_obtenido: puntaje,
      },
    });

    const saltos = pregunta.saltos as Record<string, string> | null;
    const siguiente = saltos?.[respuesta] ?? pregunta.siguiente ?? FIN;

    const datosProspecto: Record<string, unknown> = {
      pregunta_actual: siguiente,
    };
    if (pregunta.campo_prospecto) {
      datosProspecto[pregunta.campo_prospecto] =
        pregunta.tipo === 'si_no' ? respuesta === 'Sí' : valor;
    }

    await this.prisma.prospecto.update({
      where: { id: prospecto.id },
      data: datosProspecto,
    });

    if (siguiente === FIN) {
      return this.finalizar(prospecto.id);
    }

    return {
      sesion_id: prospecto.sesion_id,
      pregunta: this.formatearPregunta(await this.obtenerPregunta(siguiente)),
      finalizado: false,
      puntaje_total: null as number | null,
      clasificacion: null as string | null,
    };
  }

  private async puntajeDe(codigo: string, respuesta: string) {
    const fila = await this.prisma.matrizCalificacion.findUnique({
      where: {
        codigo_pregunta_opcion_respuesta: {
          codigo_pregunta: codigo,
          opcion_respuesta: respuesta,
        },
      },
    });
    return fila?.puntaje ?? 0;
  }

  private async obtenerPregunta(codigo: string) {
    const pregunta = await this.prisma.preguntaChatbot.findFirst({
      where: { codigo, activa: true },
    });
    if (!pregunta) {
      throw new NotFoundException(`No existe la pregunta ${codigo}`);
    }
    return pregunta;
  }

  private formatearPregunta(pregunta: {
    codigo: string;
    texto: string;
    tipo: string;
    opciones: unknown;
  }) {
    return {
      codigo: pregunta.codigo,
      texto: pregunta.texto,
      tipo: pregunta.tipo,
      opciones: pregunta.opciones as string[] | null,
    };
  }
  private validarRespuesta(
    pregunta: { tipo: string; opciones: unknown; codigo: string },
    respuesta: string,
  ): string | number {
    const opciones = pregunta.opciones as string[] | null;

    if (pregunta.tipo === 'opcion_unica' || pregunta.tipo === 'si_no') {
      if (!opciones?.includes(respuesta)) {
        throw new BadRequestException(
          `Respuesta no valida para ${pregunta.codigo}. Opciones: ${opciones?.join(' | ')}`,
        );
      }
      return respuesta;
    }

    if (pregunta.tipo === 'numero') {
      const numero = Number(respuesta.replace(',', '.'));
      if (!Number.isFinite(numero) || numero < 0) {
        throw new BadRequestException(
          `${pregunta.codigo} espera un numero positivo`,
        );
      }
      return numero;
    }

    return respuesta.trim();
  }

  private async finalizar(prospectoId: number) {
    const suma = await this.prisma.respuestaChatbot.aggregate({
      where: { prospecto_id: prospectoId },
      _sum: { puntaje_obtenido: true },
    });

    const puntaje = suma._sum.puntaje_obtenido ?? 0;
    const clasificacion =
      puntaje >= UMBRAL_CALIENTE
        ? 'caliente'
        : puntaje >= UMBRAL_TIBIO
          ? 'tibio'
          : 'frio';

    const prospecto = await this.prisma.prospecto.update({
      where: { id: prospectoId },
      data: {
        puntaje_total: puntaje,
        clasificacion,
        estado: 'calificado',
        pregunta_actual: FIN,
        fecha_finalizacion: new Date(),
      },
    });

    return {
      sesion_id: prospecto.sesion_id,
      pregunta: null as ReturnType<ChatbotService['formatearPregunta']> | null,
      finalizado: true,
      puntaje_total: puntaje as number | null,
      clasificacion: clasificacion as string | null,
    };
  }
}
