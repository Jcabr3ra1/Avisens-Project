import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

const MODELO = process.env.CLAUDE_MODEL ?? 'claude-haiku-4-5';
const MAX_TOKENS = 256;
const TIMEOUT_MS = 8000;

const INSTRUCCIONES_OPCION = `Interpretas lo que responde un avicultor colombiano en un
chatbot de cotizacion. Traduce su respuesta libre a la opcion valida que mejor la
representa. Si la respuesta es ambigua o no corresponde a ninguna opcion, elige la
mas conservadora. Nunca inventes una opcion que no este en la lista.`;

const INSTRUCCIONES_DATO = `Extraes un dato concreto de lo que escribio un avicultor
colombiano en un chatbot. Devuelve SOLO el dato pedido, limpio: sin la frase que lo
rodea, sin muletillas, sin comillas y sin puntos de miles en los documentos o
telefonos. Si el dato no aparece en el texto, devuelve el texto tal cual.`;

@Injectable()
export class ChatbotNluService {
  private readonly logger = new Logger(ChatbotNluService.name);
  private readonly claude = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  async interpretar(
    pregunta: { texto: string; tipo: string; opciones: unknown },
    textoLibre: string,
  ): Promise<string | null> {
    const opciones = pregunta.opciones as string[] | null;
    const esOpcion =
      pregunta.tipo === 'opcion_unica' || pregunta.tipo === 'si_no';

    if (esOpcion && (!opciones || opciones.includes(textoLibre))) return null;

    const esquema = esOpcion
      ? { valor: { type: 'string', enum: opciones } }
      : pregunta.tipo === 'numero'
        ? { valor: { type: 'number' } }
        : { valor: { type: 'string' } };

    const instrucciones = esOpcion ? INSTRUCCIONES_OPCION : INSTRUCCIONES_DATO;

    try {
      const respuesta = await this.claude.messages.create(
        {
          model: MODELO,
          max_tokens: MAX_TOKENS,
          system: instrucciones,
          tool_choice: { type: 'tool', name: 'elegir' },
          tools: [
            {
              name: 'elegir',
              description:
                'Devuelve el valor que corresponde a lo que dijo el usuario.',
              strict: true,
              input_schema: {
                type: 'object',
                properties: esquema,
                required: ['valor'],
                additionalProperties: false,
              },
            },
          ],
          messages: [
            {
              role: 'user',
              content: `Pregunta: ${pregunta.texto}\nRespuesta del usuario: "${textoLibre}"`,
            },
          ],
        },
        { timeout: TIMEOUT_MS },
      );

      const bloque = respuesta.content.find((b) => b.type === 'tool_use');
      if (!bloque || bloque.type !== 'tool_use') return null;

      const { valor } = bloque.input as { valor: string | number };
      this.logger.log(`NLU: "${textoLibre}" -> ${String(valor)}`);
      return String(valor);
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : 'error desconocido';
      this.logger.warn(`NLU no disponible: ${mensaje}`);
      return null;
    }
  }
}
