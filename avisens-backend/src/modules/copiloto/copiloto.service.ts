import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../../prisma/prisma.service';
import type { Solicitante } from '../../common/auth/acceso';
import { LotesService } from '../lotes/lotes.service';
import { IndicadoresService } from '../indicadores/indicadores.service';
import { PrediccionesService } from '../predicciones/predicciones.service';
import { RecomendacionesService } from '../recomendaciones/recomendaciones.service';
import { CurvaCrecimientoService } from '../predicciones/curva-crecimiento.service';
import { RiesgoCalorService } from '../predicciones/riesgo-calor.service';
import { HERRAMIENTAS } from './copiloto.herramientas';
import {
  resumirCurvaParaClaude,
  resumirRiesgoParaClaude,
  type Visualizacion,
} from './copiloto.visualizaciones';
import { PreguntarDto } from './dto/preguntar.dto';

const MODELO = process.env.CLAUDE_MODEL ?? 'claude-haiku-4-5';
const MAX_VUELTAS = 5;
const MAX_TOKENS = 2048;

const INSTRUCCIONES = `Eres AVIA, el copiloto de Avisens, un sistema de monitoreo
para granjas avicolas de pollo de engorde en Colombia.

Reglas:
- Responde SIEMPRE en espanol, de forma breve y concreta.
- NUNCA inventes datos. Si necesitas cifras de un lote, usa las herramientas.
- Si no encuentras el dato, dilo claramente en vez de suponerlo.
- Interpreta los numeros para el avicultor, no los recites: di si va bien o mal
  y por que. Un FCR bajo es bueno; una mortalidad alta es mala.
- Usa terminos del oficio: lote, galpon, faena, FCR, EPEF, curva objetivo.
- Si el usuario menciona un lote de forma vaga, usa listar_lotes primero.
- Para preguntas de crecimiento o peso futuro usa proyeccion_crecimiento: el
  usuario vera un grafico, asi que explica en 2 o 3 frases que significa
  (va bien o mal frente al estandar, cuando llega al objetivo, que hacer).
- Para preguntas de calor, ventilacion o clima en el galpon usa
  riesgo_calor_galpon y explica el nivel maximo, la hora del pico y que hacer.
- Si riesgo_calor_galpon no trae temperatura ni humedad de interior, avisa
  que el galpon no tiene sensores reportando y que el calculo usa solo el
  clima exterior.`;

@Injectable()
export class CopilotoService {
  private readonly logger = new Logger(CopilotoService.name);
  private readonly claude = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  constructor(
    private prisma: PrismaService,
    private lotesService: LotesService,
    private indicadoresService: IndicadoresService,
    private prediccionesService: PrediccionesService,
    private recomendacionesService: RecomendacionesService,
    private curvaCrecimientoService: CurvaCrecimientoService,
    private riesgoCalorService: RiesgoCalorService,
  ) {}

  private async ejecutarHerramienta(
    nombre: string,
    entrada: Record<string, unknown>,
    solicitante: Solicitante,
    visualizaciones: Visualizacion[],
  ): Promise<unknown> {
    const loteId = Number(entrada.lote_id);

    try {
      switch (nombre) {
        case 'listar_lotes':
          return await this.lotesService.listar(solicitante, {
            page: 1,
            limit: 20,
          });

        case 'consultar_indicadores': {
          const [historico, comparacion] = await Promise.all([
            this.indicadoresService.listar(loteId, solicitante),
            this.indicadoresService.compararConCurva(loteId, solicitante),
          ]);
          return { ultimos_indicadores: historico.slice(-3), comparacion };
        }

        case 'consultar_prediccion':
          return await this.prediccionesService.predecir(loteId, solicitante);

        case 'consultar_recomendaciones':
          return await this.recomendacionesService.listar(loteId, solicitante);

        case 'proyeccion_crecimiento': {
          const curva = await this.curvaCrecimientoService.calcular(
            loteId,
            solicitante,
          );
          visualizaciones.push({
            tipo: 'curva_crecimiento',
            titulo: `Crecimiento del lote ${curva.codigo}`,
            datos: curva,
          });
          return resumirCurvaParaClaude(curva);
        }

        case 'riesgo_calor_galpon': {
          const riesgo = await this.riesgoCalorService.calcular(
            Number(entrada.galpon_id),
            solicitante,
          );
          return resumirRiesgoParaClaude(riesgo);
        }

        default:
          return { error: `Herramienta desconocida: ${nombre}` };
      }
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : 'Error desconocido';
      this.logger.warn(`Herramienta ${nombre} fallo: ${mensaje}`);
      return { error: mensaje };
    }
  }
  private async obtenerConversacion(
    dto: PreguntarDto,
    solicitante: Solicitante,
  ) {
    if (dto.conversacion_id) {
      const existente = await this.prisma.conversacionIa.findFirst({
        where: { id: dto.conversacion_id, usuario_id: solicitante.id },
      });
      if (!existente) throw new NotFoundException('Conversacion no encontrada');
      return existente;
    }

    return this.prisma.conversacionIa.create({
      data: {
        usuario_id: solicitante.id,
        titulo: dto.pregunta.slice(0, 60),
      },
    });
  }
  private async historial(
    conversacionId: number,
  ): Promise<Anthropic.MessageParam[]> {
    const mensajes = await this.prisma.mensajeIa.findMany({
      where: { conversacion_id: conversacionId },
      orderBy: { fecha: 'desc' },
      take: 20,
    });

    return mensajes.reverse().map((m) => ({
      role: m.rol === 'assistant' ? 'assistant' : 'user',
      content: m.contenido,
    }));
  }
  private llamarClaude(mensajes: Anthropic.MessageParam[]) {
    return this.claude.messages.create({
      model: MODELO,
      max_tokens: MAX_TOKENS,
      system: INSTRUCCIONES,
      tools: HERRAMIENTAS,
      messages: mensajes,
    });
  }

  async preguntar(dto: PreguntarDto, solicitante: Solicitante) {
    const conversacion = await this.obtenerConversacion(dto, solicitante);
    const mensajes = await this.historial(conversacion.id);
    mensajes.push({ role: 'user', content: dto.pregunta });

    let respuesta = await this.llamarClaude(mensajes);
    let vueltas = 0;
    const visualizaciones: Visualizacion[] = [];

    while (respuesta.stop_reason === 'tool_use' && vueltas < MAX_VUELTAS) {
      vueltas++;
      mensajes.push({ role: 'assistant', content: respuesta.content });

      const resultados: Anthropic.ToolResultBlockParam[] = [];
      for (const bloque of respuesta.content) {
        if (bloque.type !== 'tool_use') continue;

        const salida = await this.ejecutarHerramienta(
          bloque.name,
          bloque.input as Record<string, unknown>,
          solicitante,
          visualizaciones,
        );

        resultados.push({
          type: 'tool_result',
          tool_use_id: bloque.id,
          content: JSON.stringify(salida),
        });
      }

      mensajes.push({ role: 'user', content: resultados });
      respuesta = await this.llamarClaude(mensajes);
    }

    const texto = respuesta.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();

    await this.prisma.mensajeIa.createMany({
      data: [
        {
          conversacion_id: conversacion.id,
          rol: 'user',
          contenido: dto.pregunta,
        },
        {
          conversacion_id: conversacion.id,
          rol: 'assistant',
          contenido: texto,
          tokens: respuesta.usage.output_tokens,
        },
      ],
    });

    await this.prisma.conversacionIa.update({
      where: { id: conversacion.id },
      data: { fecha_ultimo_mensaje: new Date() },
    });

    return {
      conversacion_id: conversacion.id,
      respuesta: texto,
      herramientas_usadas: vueltas,
      visualizaciones,
    };
  }
}
