import Anthropic from '@anthropic-ai/sdk';
import { Injectable, Logger } from '@nestjs/common';

const MODELO = process.env.CLAUDE_MODEL ?? 'claude-haiku-4-5';
const NINGUNA = 'NINGUNA';
const TIEMPO_LIMITE_MS = 4000;

/**
 * Traduce una respuesta escrita a mano a una de las opciones de la pregunta.
 *
 * El chatbot dejo de usar IA a proposito: interpreta el numero de la opcion o
 * su texto, de forma determinista. Esto NO revierte esa decision. Es un
 * respaldo que solo entra cuando la persona escribio algo que no coincide con
 * ninguna opcion -"como 3000 pollos", "se me va la luz a cada rato"- y la
 * alternativa es rechazarle la respuesta o guardar texto que no significa nada.
 *
 * El trabajo es clasificar dentro de una lista cerrada, no conversar. Si no hay
 * API key, si la llamada falla o si tarda demasiado, devuelve null y el flujo
 * se comporta exactamente igual que antes.
 */
@Injectable()
export class InterpreteRespuestaService {
  private readonly logger = new Logger(InterpreteRespuestaService.name);
  private readonly claude = process.env.ANTHROPIC_API_KEY
    ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    : null;

  get disponible(): boolean {
    return this.claude !== null;
  }

  async interpretar(
    preguntaTexto: string,
    opciones: string[],
    respuesta: string,
  ): Promise<string | null> {
    if (!this.claude || !opciones.length) return null;

    const lista = opciones.map((o, i) => `${i + 1}. ${o}`).join('\n');
    try {
      const salida = await this.claude.messages.create(
        {
          model: MODELO,
          max_tokens: 16,
          system:
            'Eres un clasificador. Recibes una pregunta con opciones y lo que ' +
            'respondio una persona en lenguaje natural. Devuelves UNICAMENTE ' +
            `el numero de la opcion que mejor corresponde, o ${NINGUNA} si ` +
            'ninguna encaja. Sin explicaciones, sin puntuacion, solo el numero. ' +
            'No inventes: si dudas entre dos o la respuesta no responde a la ' +
            `pregunta, devuelve ${NINGUNA}.`,
          messages: [
            {
              role: 'user',
              content: `Pregunta: ${preguntaTexto}\n\nOpciones:\n${lista}\n\nRespondio: "${respuesta}"`,
            },
          ],
        },
        { timeout: TIEMPO_LIMITE_MS },
      );

      const texto = salida.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('')
        .trim();

      const indice = Number(texto.match(/\d+/)?.[0]);
      if (!Number.isInteger(indice) || indice < 1 || indice > opciones.length) {
        return null;
      }
      return opciones[indice - 1];
    } catch (e) {
      // Que el modelo no responda no puede tumbar la conversacion: se sigue
      // con el comportamiento determinista de siempre.
      this.logger.warn(
        `No se pudo interpretar la respuesta: ${e instanceof Error ? e.message : 'error'}`,
      );
      return null;
    }
  }
}
