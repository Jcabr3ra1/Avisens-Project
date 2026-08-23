import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { IniciarChatDto } from './dto/iniciar-chat.dto';
import { ResponderChatDto } from './dto/responder-chat.dto';

const PRIMERA_PREGUNTA = 'A1';
const PRIMERA_PREGUNTA_PQRS = 'B1';
const RUTA_PQRS = 'general';
const FIN = 'FIN';

const UMBRAL_CALIENTE = 12;
const UMBRAL_TIBIO = 7;
const SIN_CONSENTIMIENTO = 'sin_consentimiento';

@Injectable()
export class ChatbotService {
  constructor(
    private prisma: PrismaService,
  ) {}

  async iniciar(dto: IniciarChatDto) {
    const canal = dto.canal_origen ?? 'web';
    // La ruta la escoge el usuario: cotizacion califica al prospecto (bloque A)
    // y general radica una solicitud PQRS (bloque B, sin puntaje).
    const primeraCodigo =
      dto.ruta === RUTA_PQRS ? PRIMERA_PREGUNTA_PQRS : PRIMERA_PREGUNTA;
    const primera = await this.primeraVisible(primeraCodigo, canal);

    const prospecto = await this.prisma.prospecto.create({
      data: {
        sesion_id: randomUUID(),
        canal_origen: canal,
        pregunta_actual: primera,
        estado: 'en_proceso',
      },
    });

    const pregunta = await this.obtenerPregunta(primera);

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

    const respuesta = this.normalizarRespuesta(pregunta, dto.respuesta);

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
    const candidato = saltos?.[respuesta] ?? pregunta.siguiente ?? FIN;
    const siguiente = await this.primeraVisible(
      candidato,
      prospecto.canal_origen,
    );

    const datosProspecto: Record<string, unknown> = {
      pregunta_actual: siguiente,
    };
    if (pregunta.campo_prospecto && valor !== '') {
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

  private async primeraVisible(codigo: string, canal: string | null) {
    let actual = codigo;
    for (let saltos = 0; saltos < 50; saltos++) {
      if (actual === FIN) return FIN;
      const pregunta = await this.prisma.preguntaChatbot.findFirst({
        where: { codigo: actual, activa: true },
        select: { omitir_si_canal: true, siguiente: true },
      });
      if (!pregunta) return FIN;
      // Solo se omite si la pregunta declara un canal Y es el del prospecto.
      // Con `!==` a secas, dos null se consideraban distintos y la saltaba.
      const omitir =
        !!pregunta.omitir_si_canal && pregunta.omitir_si_canal === canal;
      if (!omitir) return actual;
      actual = pregunta.siguiente ?? FIN;
    }
    return FIN;
  }

  async preguntaActual(sesionId: string) {
    const prospecto = await this.prisma.prospecto.findUnique({
      where: { sesion_id: sesionId },
      select: { pregunta_actual: true },
    });

    if (!prospecto?.pregunta_actual || prospecto.pregunta_actual === FIN) {
      return null;
    }

    return this.formatearPregunta(
      await this.obtenerPregunta(prospecto.pregunta_actual),
    );
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
  private sinTildes(texto: string) {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private normalizarRespuesta(
    pregunta: { tipo: string; opciones: unknown },
    respuesta: string,
  ) {
    const opciones = pregunta.opciones as string[] | null;
    if (!opciones?.length) return respuesta.trim();

    const texto = respuesta.trim();

    const indice = Number(texto);
    if (Number.isInteger(indice) && indice >= 1 && indice <= opciones.length) {
      return opciones[indice - 1];
    }

    const buscado = this.sinTildes(texto);
    return (
      opciones.find((o) => this.sinTildes(o) === buscado) ?? texto
    );
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

    const respuestas = await this.prisma.respuestaChatbot.findMany({
      where: { prospecto_id: prospectoId },
      orderBy: { id: 'asc' },
      select: {
        bloque: true,
        codigo_pregunta: true,
        respuesta_texto: true,
      },
    });

    // Ruta PQRS (bloque B): no hay puntaje ni clasificacion comercial; la
    // solicitud queda radicada con su categoria, asunto y detalle.
    const esPqrs = respuestas.some((r) => r.bloque === 'B');

    if (esPqrs) {
      const porCodigo = new Map(
        respuestas.map((r) => [r.codigo_pregunta, r.respuesta_texto]),
      );
      await this.prisma.solicitudPqrs.create({
        data: {
          prospecto_id: prospectoId,
          categoria: porCodigo.get('B1') ?? 'Petición',
          asunto: porCodigo.get('B2'),
          mensaje: porCodigo.get('B3'),
          estado: 'abierta',
        },
      });

      const cerrado = await this.prisma.prospecto.update({
        where: { id: prospectoId },
        data: {
          estado: 'pqrs',
          pregunta_actual: FIN,
          fecha_finalizacion: new Date(),
        },
      });

      return {
        sesion_id: cerrado.sesion_id,
        pregunta: null as ReturnType<
          ChatbotService['formatearPregunta']
        > | null,
        finalizado: true,
        puntaje_total: null as number | null,
        clasificacion: 'pqrs' as string | null,
      };
    }

    const datos = await this.prisma.prospecto.findUnique({
      where: { id: prospectoId },
      select: { consentimiento_habeas_data: true },
    });

    // Quien no autoriza el tratamiento de datos no es un prospecto frio: no es
    // un prospecto. No entra a la cola comercial ni se le puede llamar.
    if (!datos?.consentimiento_habeas_data) {
      const cerrado = await this.prisma.prospecto.update({
        where: { id: prospectoId },
        data: {
          estado: SIN_CONSENTIMIENTO,
          pregunta_actual: FIN,
          fecha_finalizacion: new Date(),
        },
      });

      return {
        sesion_id: cerrado.sesion_id,
        pregunta: null as ReturnType<
          ChatbotService['formatearPregunta']
        > | null,
        finalizado: true,
        puntaje_total: null as number | null,
        clasificacion: SIN_CONSENTIMIENTO as string | null,
      };
    }

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
