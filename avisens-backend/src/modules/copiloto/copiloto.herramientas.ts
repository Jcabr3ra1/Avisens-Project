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
      'Proyecciones de un lote usando el objetivo real de su PlanLote vigente (peso objetivo y dia de faena vienen del plan, no de un valor fijo): peso final, mortalidad proyectada, consumo de alimento proyectado y FCR proyectado. Incluye llegada_proyectada (dia de vida y fecha en que el modelo estima que se alcanza el peso objetivo) como dato informativo, nunca como el dia de faena usado para las demas magnitudes. Todavia NO compara contra ninguna curva objetivo -- pendiente. Si el lote no tiene un plan calculado y vigente, o si el plan quedo desactualizado, la herramienta puede fallar con un error explicito en vez de devolver una prediccion. Usala para preguntas sobre el futuro: cuanto va a pesar, cuando llega a su peso objetivo, cuanto alimento falta.',
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
