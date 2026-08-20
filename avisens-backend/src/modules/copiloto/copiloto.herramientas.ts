import type Anthropic from '@anthropic-ai/sdk';

export const HERRAMIENTAS: Anthropic.Tool[] = [
  {
    name: 'listar_lotes',
    description:
      'Lista los lotes que el usuario puede ver, con id, codigo, galpon, granja, fecha de ingreso, cantidad inicial y estado. Usala SIEMPRE primero cuando el usuario mencione un lote de forma vaga ("mi lote", "el del galpon 1", "L-2026-01") para resolver el id numerico real. No inventes ids.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'consultar_indicadores',
    description:
      'KPIs zootecnicos mas recientes de un lote: FCR, EPEF, mortalidad acumulada, consumo, peso promedio y dia de vida, mas la comparacion contra la curva objetivo de la marca de alimento. Usala para preguntas sobre como va el lote, si va bien o mal, o sobre eficiencia.',
    input_schema: {
      type: 'object',
      properties: {
        lote_id: { type: 'number', description: 'Id numerico del lote' },
      },
      required: ['lote_id'],
    },
  },
  {
    name: 'consultar_prediccion',
    description:
      'Proyecciones al dia de faena de un lote: peso final, dias para alcanzar el peso objetivo, mortalidad proyectada, consumo de alimento proyectado y FCR proyectado, con su comparacion contra la curva objetivo. Usala para preguntas sobre el futuro: cuanto va a pesar, cuando sale, cuanto alimento falta.',
    input_schema: {
      type: 'object',
      properties: {
        lote_id: { type: 'number', description: 'Id numerico del lote' },
      },
      required: ['lote_id'],
    },
  },
  {
    name: 'consultar_recomendaciones',
    description:
      'Recomendaciones abiertas generadas por el sistema para un lote, con su prioridad y el motivo. Usala cuando el usuario pregunte que deberia hacer o que problemas tiene el lote.',
    input_schema: {
      type: 'object',
      properties: {
        lote_id: { type: 'number', description: 'Id numerico del lote' },
      },
      required: ['lote_id'],
    },
  },
];
