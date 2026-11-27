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
  {
    name: 'proyeccion_crecimiento',
    description:
      'Curva de crecimiento del lote con el modelo de Gompertz anclado a su curva genetica (Ross 308 o Cobb 500): pesajes reales, peso proyectado hasta el dia de faena con su rango probable, el estandar de la linea, el desvio del ultimo pesaje frente al estandar, el dia en que llega al peso objetivo y el dia de crecimiento mas rapido. El usuario ve ademas un grafico con la curva. Usala cuando pregunte como va creciendo el lote, cuanto va a pesar, cuando llega al peso objetivo o si va por encima o por debajo del estandar.',
    input_schema: {
      type: 'object',
      properties: {
        lote_id: { type: 'number', description: 'Id numerico del lote' },
      },
      required: ['lote_id'],
    },
  },
  {
    name: 'riesgo_calor_galpon',
    description:
      'Riesgo de estres por calor de un galpon en las proximas horas: cruza el pronostico del clima de la granja con la temperatura y humedad que miden sus sensores, calcula el indice THI y lo ajusta a la edad del lote activo. Devuelve el nivel maximo esperado, la hora del pico, la primera hora en alerta, cuantas horas pasa en cada nivel y recomendaciones de manejo. Usala cuando el usuario pregunte por calor, temperatura, si las aves van a sufrir, si debe ventilar o nebulizar, o como va a estar el clima en el galpon. Necesita el id numerico del galpon: si el usuario lo nombra de forma vaga, usa primero listar_lotes, que trae el galpon de cada lote.',
    input_schema: {
      type: 'object',
      properties: {
        galpon_id: { type: 'number', description: 'Id numerico del galpon' },
      },
      required: ['galpon_id'],
    },
  },
];
