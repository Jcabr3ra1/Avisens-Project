import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CotizacionesService } from '../cotizaciones/cotizaciones.service';
import { InterpreteRespuestaService } from './interprete-respuesta.service';
import { IniciarChatDto } from './dto/iniciar-chat.dto';
import { ResponderChatDto } from './dto/responder-chat.dto';
import {
  NO_DECIDE,
  SIN_SENAL,
  clasificarSoporte,
  radicadoDe,
  tieneDolor,
  viabilidadTecnica,
} from './dominio/calificacion';

const PRIMERA_PREGUNTA = 'M1';
const PRIMERA_PREGUNTA_PQRS = 'B1';
const PRIMERA_PREGUNTA_COTIZACION = 'A1';
const PRIMERA_PREGUNTA_SOPORTE = 'S1';
const RUTA_PQRS = 'general';
const RUTA_COTIZACION = 'cotizacion';
const RUTA_SOPORTE = 'soporte';
const FIN = 'FIN';
const CONFIRMAR = 'CONFIRMAR';
const CORREGIR = 'CORREGIR';
const PREFIJO_CORRECCION = 'FIX:';

// Que dato se puede corregir y a que pregunta corresponde. Se ofrece elegir en
// vez de rehacer el cuestionario entero.
const CORREGIBLES: Array<[string, string]> = [
  ['Nombre', 'A2'],
  ['Número de galpones', 'A5'],
  ['Tamaño del galpón', 'A6'],
  ['Teléfono', 'C1'],
  ['Correo', 'C2'],
];
const CAMPOS_NUMERICOS = new Set([
  'numero_galpones',
  'area_granja_m2',
  'area_galpon_m2',
]);

// Sobre PUNTAJE_MAXIMO (12): dos tercios para caliente, 40% para tibio. Antes
// eran 12 y 7 sobre 16, que son proporciones equivalentes.
const UMBRAL_CALIENTE = 8;
const UMBRAL_TIBIO = 5;

const VISITA_PRESENCIAL = 'VISITA_PRESENCIAL';
const DEMO_REMOTA = 'DEMO_REMOTA';
const SEGUIMIENTO_AUTOMATIZADO = 'SEGUIMIENTO_AUTOMATIZADO';
const CALLBACK_DECISOR = 'CALLBACK_DECISOR';

const HORAS_CALLBACK = 48;
const SIN_CONSENTIMIENTO = 'sin_consentimiento';

const VALIDACION_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALIDACION_TELEFONO = /^\+?[\d\s\-()]{7,15}$/;
const VALIDACION_DOCUMENTO = /^[\d\-.]+$/;

// El cuestionario se anuncia en cuatro bloques, cada uno diciendo cuantas
// preguntas trae. Saber que faltan tres se siente mucho mas corto que recibir
// tres mensajes sueltos sin final a la vista. Los bloques coinciden con las
// pantallas del formulario de WhatsApp Flows, para que el dia que se publique
// no haya que reagrupar nada.
const MENSAJES_TRANSICION: Record<string, string> = {
  A5: '🏘️ *Tu granja* — 3 preguntas para poder cotizarte',
  A9: '⚙️ *Cómo está montada* — 3 preguntas rápidas',
  A14: '🎯 *Qué necesitas* — 5 preguntas y terminamos',
  C1: '📞 *Casi listo* — solo falta cómo contactarte',
};

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  constructor(
    private prisma: PrismaService,
    private cotizaciones: CotizacionesService,
    private interprete: InterpreteRespuestaService,
  ) {}

  async iniciar(dto: IniciarChatDto) {
    const canal = dto.canal_origen ?? 'web';
    // La ruta la escoge el usuario: cotizacion califica al prospecto (bloque A)
    // y general radica una solicitud PQRS (bloque B, sin puntaje).
    // Si quien abre el chat ya eligio a que viene -el boton "Cotizar" de la web
    // manda ruta: 'cotizacion'-, el menu sobra: preguntarle otra vez lo que
    // acaba de decir es un paso regalado. El menu queda para WhatsApp, donde
    // la persona solo escribe "hola" y no hay ruta.
    const primeraCodigo =
      dto.ruta === RUTA_PQRS
        ? PRIMERA_PREGUNTA_PQRS
        : dto.ruta === RUTA_SOPORTE
          ? PRIMERA_PREGUNTA_SOPORTE
          : dto.ruta === RUTA_COTIZACION
            ? PRIMERA_PREGUNTA_COTIZACION
            : PRIMERA_PREGUNTA;
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
      mensaje_transicion: null as string | null,
      progreso: 0 as number | null,
      total_pasos: null as number | null,
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

    if (prospecto.pregunta_actual === CONFIRMAR) {
      const respuesta = dto.respuesta.trim().toLowerCase();
      if (respuesta === 'sí' || respuesta === 'si' || respuesta === 'confirmar') {
        return this.finalizar(prospecto.id);
      }
      await this.prisma.prospecto.update({
        where: { id: prospecto.id },
        data: { pregunta_actual: CORREGIR, estado: 'en_proceso' },
      });

      return {
        sesion_id: prospecto.sesion_id,
        pregunta: this.menuCorreccion(),
        mensaje_transicion: '✏️ Claro. ¿Qué dato quieres corregir?',
        progreso: null as number | null,
        total_pasos: null as number | null,
        finalizado: false,
        puntaje_total: null as number | null,
        clasificacion: null as string | null,
      };
    }

    if (prospecto.pregunta_actual === CORREGIR) {
      const elegido = this.sinTildes(dto.respuesta);
      const par = CORREGIBLES.find(
        ([etiqueta]) => this.sinTildes(etiqueta) === elegido,
      );

      if (!par) {
        throw new BadRequestException(
          `Elige uno de los datos: ${CORREGIBLES.map(([e]) => e).join(' | ')}`,
        );
      }

      await this.prisma.prospecto.update({
        where: { id: prospecto.id },
        data: { pregunta_actual: PREFIJO_CORRECCION + par[1] },
      });

      return {
        sesion_id: prospecto.sesion_id,
        pregunta: this.formatearPregunta(await this.obtenerPregunta(par[1])),
        mensaje_transicion: null as string | null,
        progreso: null as number | null,
        total_pasos: null as number | null,
        finalizado: false,
        puntaje_total: null as number | null,
        clasificacion: null as string | null,
      };
    }

    const corrigiendo = prospecto.pregunta_actual.startsWith(
      PREFIJO_CORRECCION,
    );
    const codigoActual = corrigiendo
      ? prospecto.pregunta_actual.slice(PREFIJO_CORRECCION.length)
      : prospecto.pregunta_actual;

    const pregunta = await this.obtenerPregunta(codigoActual);

    const respuesta = await this.resolverRespuesta(pregunta, dto.respuesta);

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

    // Al corregir un dato se vuelve al resumen, no se sigue el cuestionario:
    // la persona ya lo recorrio entero.
    const siguiente = corrigiendo
      ? CONFIRMAR
      : await this.primeraVisible(candidato, prospecto.canal_origen);

    const datosProspecto: Record<string, unknown> = {
      pregunta_actual: siguiente,
    };
    if (pregunta.campo_prospecto && valor !== '') {
      datosProspecto[pregunta.campo_prospecto] =
        pregunta.tipo === 'si_no'
          ? !/^no\b/i.test(respuesta.trim())
          : pregunta.tipo === 'opcion_unica' &&
              CAMPOS_NUMERICOS.has(pregunta.campo_prospecto)
            ? this.metrosDeRango(respuesta)
            : valor;
    }

    await this.prisma.prospecto.update({
      where: { id: prospecto.id },
      data: datosProspecto,
    });

    if (siguiente === CONFIRMAR) {
      return {
        sesion_id: prospecto.sesion_id,
        pregunta: {
          codigo: CONFIRMAR,
          texto: await this.obtenerResumen(prospecto.id),
          tipo: 'si_no',
          opciones: ['Sí', 'No, corregir datos'],
        },
        mensaje_transicion: '✅ Dato actualizado.',
        progreso: null as number | null,
        total_pasos: null as number | null,
        finalizado: false,
        puntaje_total: null as number | null,
        clasificacion: null as string | null,
      };
    }

    if (siguiente === FIN) {
      // El resumen "confirma tus datos" es del cuestionario de cotizacion.
      // Ni una consulta frecuente (B) ni una PQRS (S) tienen datos que
      // confirmar: se cierran directo.
      const sinResumen = pregunta.bloque === 'B' || pregunta.bloque === 'S';
      if (!sinResumen) {
        const resumen = await this.obtenerResumen(prospecto.id);
        await this.prisma.prospecto.update({
          where: { id: prospecto.id },
          data: { pregunta_actual: CONFIRMAR },
        });
        return {
          sesion_id: prospecto.sesion_id,
          pregunta: {
            codigo: CONFIRMAR,
            texto: resumen,
            tipo: 'si_no',
            opciones: ['Sí', 'No, corregir datos'],
          },
          mensaje_transicion: null as string | null,
          progreso: null as number | null,
          total_pasos: null as number | null,
          finalizado: false,
          puntaje_total: null as number | null,
          clasificacion: null as string | null,
        };
      }
      return this.finalizar(prospecto.id);
    }

    const respondidas = await this.contarRespondidas(prospecto.id);
    const mensajeTransicion = MENSAJES_TRANSICION[siguiente] ?? null;

    return {
      sesion_id: prospecto.sesion_id,
      pregunta: this.formatearPregunta(await this.obtenerPregunta(siguiente)),
      mensaje_transicion: mensajeTransicion,
      progreso: respondidas,
      total_pasos: await this.totalPasos(),
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

  private async contarRespondidas(prospectoId: number): Promise<number> {
    const count = await this.prisma.respuestaChatbot.count({
      where: { prospecto_id: prospectoId },
    });
    return count;
  }

  private menuCorreccion() {
    return {
      codigo: CORREGIR,
      texto: '✏️ ¿Qué dato quieres corregir?',
      tipo: 'opcion_unica',
      opciones: CORREGIBLES.map(([etiqueta]) => etiqueta),
    };
  }

  private async obtenerResumen(prospectoId: number): Promise<string> {
    const prospecto = await this.prisma.prospecto.findUnique({
      where: { id: prospectoId },
      select: {
        nombre: true,
        tipo_documento: true,
        documento: true,
        municipio: true,
        area_granja_m2: true,
        area_galpon_m2: true,
        telefono: true,
        email: true,
      },
    });

    if (!prospecto) return '';

    const lineas: string[] = ['📋 *Resumen de tus datos:*\n'];

    if (prospecto.nombre) lineas.push(`👤 *Nombre:* ${prospecto.nombre}`);
    if (prospecto.tipo_documento || prospecto.documento) {
      const doc = [prospecto.tipo_documento, prospecto.documento].filter(Boolean).join(' ');
      lineas.push(`🪪 *Documento:* ${doc}`);
    }
    if (prospecto.municipio) lineas.push(`📍 *Ubicación:* ${prospecto.municipio}`);
    if (prospecto.area_granja_m2) lineas.push(`🌾 *Tamaño granja:* ${prospecto.area_granja_m2} m²`);
    if (prospecto.area_galpon_m2) lineas.push(`🏠 *Tamaño galpón:* ${prospecto.area_galpon_m2} m²`);
    if (prospecto.telefono) lineas.push(`📞 *Teléfono:* ${prospecto.telefono}`);
    if (prospecto.email) lineas.push(`📧 *Email:* ${prospecto.email}`);

    lineas.push('\n¿Confirmas que estos datos son correctos?');

    return lineas.join('\n');
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

  /**
   * Determinista primero, IA despues. Si la persona escribio el numero de la
   * opcion o su texto, se resuelve sin llamar a nadie. Solo cuando escribio
   * algo distinto -"como 3000 pollos"- se le pide al modelo que lo ubique en
   * la lista, y si no lo consigue se sigue con el texto tal cual, igual que
   * antes de existir esto.
   */
  private async resolverRespuesta(
    pregunta: { codigo: string; texto: string; tipo: string; opciones: unknown },
    original: string,
  ): Promise<string> {
    const normalizada = this.normalizarRespuesta(pregunta, original);
    const opciones = pregunta.opciones as string[] | null;
    if (!opciones?.length || opciones.includes(normalizada)) {
      return normalizada;
    }

    const interpretada = await this.interprete.interpretar(
      pregunta.texto,
      opciones,
      original,
    );
    if (interpretada) {
      this.logger.log(
        `${pregunta.codigo}: "${original}" se interpreto como "${interpretada}"`,
      );
      return interpretada;
    }
    return normalizada;
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
    pregunta: { tipo: string; opciones: unknown; codigo: string; campo_prospecto?: string | null },
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

    const texto = respuesta.trim();

    if (texto && pregunta.campo_prospecto === 'email' && !VALIDACION_EMAIL.test(texto)) {
      throw new BadRequestException(
        'El correo electrónico no parece válido. Por favor verifica e intenta de nuevo.',
      );
    }

    if (texto && pregunta.campo_prospecto === 'telefono' && !VALIDACION_TELEFONO.test(texto)) {
      throw new BadRequestException(
        'El número de teléfono no parece válido. Usa solo números, opcionalmente con +, espacios o guiones.',
      );
    }

    if (texto && pregunta.campo_prospecto === 'documento' && !VALIDACION_DOCUMENTO.test(texto)) {
      throw new BadRequestException(
        'El documento debe contener solo números, puntos o guiones.',
      );
    }

    return texto;
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
    const esSoporte = respuestas.some((r) => r.bloque === 'S');
    if (esSoporte) {
      const porCodigo = new Map(
        respuestas.map((r) => [r.codigo_pregunta, r.respuesta_texto]),
      );
      const { categoria, horas } = clasificarSoporte(porCodigo.get('S2'));

      const solicitud = await this.prisma.solicitudPqrs.create({
        data: {
          prospecto_id: prospectoId,
          categoria,
          codigo_pregunta: 'S2',
          asunto: porCodigo.get('S2'),
          mensaje: porCodigo.get('S3'),
          estado: 'abierta',
        },
        select: { id: true },
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
        // El radicado se le muestra: sin numero, el cliente no tiene con que
        // preguntar despues por su caso.
        mensaje_transicion:
          `✅ Listo. Tu solicitud quedó radicada con el número ` +
          `*${radicadoDe(solicitud.id)}*.` +
          (horas
            ? `\n\nUn asesor te responde dentro de las próximas ${horas} horas. ` +
              `Guarda ese número para hacerle seguimiento.`
            : `\n\nGracias por la sugerencia: la revisamos con el equipo de producto.`),
        progreso: null as number | null,
        total_pasos: null as number | null,
        finalizado: true,
        puntaje_total: null as number | null,
        clasificacion: 'pqrs' as string | null,
      };
    }

    const esConsulta = respuestas.some((r) => r.bloque === 'B');

    // El bloque B quedo reducido a las preguntas frecuentes de preventa. La
    // radicacion de PQRS se retiro: era soporte para clientes que ya compraron,
    // y todavia no hay ninguno. Cuando los haya, va en su propio canal, no
    // mezclado con el cuestionario que califica prospectos.
    if (esConsulta) {
      const cerrado = await this.prisma.prospecto.update({
        where: { id: prospectoId },
        data: {
          estado: 'consulta_atendida',
          pregunta_actual: FIN,
          fecha_finalizacion: new Date(),
        },
      });

      return {
        sesion_id: cerrado.sesion_id,
        pregunta: null as ReturnType<
          ChatbotService['formatearPregunta']
        > | null,
        mensaje_transicion: null as string | null,
        progreso: null as number | null,
        total_pasos: null as number | null,
        finalizado: true,
        puntaje_total: null as number | null,
        clasificacion: 'consulta_atendida' as string | null,
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
        mensaje_transicion: null as string | null,
        progreso: null as number | null,
        total_pasos: null as number | null,
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

    const porCodigo = new Map(
      respuestas.map((r) => [r.codigo_pregunta, r.respuesta_texto]),
    );

    // Regla previa del documento: sin poder de decision el lead no se enruta
    // por puntaje, se agenda callback con el responsable de compra.
    const decide = porCodigo.get('A20') !== NO_DECIDE;

    const accion = !decide
      ? CALLBACK_DECISOR
      : clasificacion === 'caliente'
        ? VISITA_PRESENCIAL
        : clasificacion === 'tibio'
          ? DEMO_REMOTA
          : SEGUIMIENTO_AUTOMATIZADO;

    const dolor = tieneDolor(porCodigo.get('A16'), porCodigo.get('A14'));

    const prospecto = await this.prisma.prospecto.update({
      where: { id: prospectoId },
      data: {
        puntaje_total: puntaje,
        clasificacion,
        accion_siguiente: accion,
        senal_caliente: dolor,
        conectividad_limitada: porCodigo.get('A13') === SIN_SENAL,
        // Semaforo tecnico, aparte del puntaje comercial: dice si se le puede
        // instalar hoy, no si quiere comprar.
        viabilidad_tecnica: viabilidadTecnica(
          porCodigo.get('A9'),
          porCodigo.get('A11'),
          porCodigo.get('A13'),
        ),
        estado: 'calificado',
        pregunta_actual: FIN,
        fecha_finalizacion: new Date(),
        ...(decide
          ? {}
          : {
              fecha_callback: new Date(
                Date.now() + HORAS_CALLBACK * 60 * 60 * 1000,
              ),
            }),
      },
    });

    return {
      sesion_id: prospecto.sesion_id,
      pregunta: null as ReturnType<ChatbotService['formatearPregunta']> | null,
      mensaje_transicion: null as string | null,
      progreso: null as number | null,
      total_pasos: null as number | null,
      finalizado: true,
      puntaje_total: puntaje as number | null,
      clasificacion: clasificacion as string | null,
      accion_siguiente: accion as string | null,
      cotizacion: decide ? await this.generarCotizacion(prospecto.id) : null,
    };
  }

  // Las preguntas de area ofrecen rangos para no obligar a teclear, pero la
  // columna es numerica y la cotizacion calcula sensores con ella. Se toma el
  // punto medio del rango; quien necesite precision escoge "Otro, lo escribo".
  // El total se cuenta desde la tabla y solo sobre los codigos canonicos del
  // documento (A1..A19): las ramas alternas como A5B no son pasos adicionales
  // para quien las recorre.
  private async totalPasos() {
    return this.prisma.preguntaChatbot.count({
      where: { bloque: 'A', activa: true, codigo: { not: { contains: 'B' } } },
    });
  }

  private metrosDeRango(respuesta: string) {
    const numeros = (respuesta.match(/\d[\d.]*/g) ?? []).map((n) =>
      Number(n.replace(/\./g, '')),
    );

    if (!numeros.length) return null;
    if (numeros.length === 1) return numeros[0];
    return Math.round((numeros[0] + numeros[1]) / 2);
  }

  private async generarCotizacion(prospectoId: number) {
    try {
      const c = await this.cotizaciones.generar(prospectoId, {});
      this.logger.log(
        `Cotizacion ${c.codigo} generada para el prospecto ${prospectoId}`,
      );
      return {
        codigo: c.codigo,
        plan_recomendado: c.plan_recomendado,
        numero_galpones: c.numero_galpones,
        valor_total_cop: c.valor_total_cop,
      };
    } catch (e) {
      // Una cotizacion fallida no puede tumbar el cierre: el prospecto ya
      // quedo calificado y un asesor puede generarla a mano.
      const mensaje = e instanceof Error ? e.message : 'error desconocido';
      this.logger.error(
        `No se pudo generar la cotizacion del prospecto ${prospectoId}: ${mensaje}`,
      );
      return null;
    }
  }
}
