import type { PrismaClient } from '@prisma/client';

interface PuntoCurvaSeed {
  sexo: string;
  dia: number;
  peso_esperado_g: number;
  consumo_diario_g?: number;
  consumo_acumulado_g?: number;
  fcr_objetivo?: number;
  etapa_alimentacion: string;
  temperatura_min?: number | null;
  temperatura_max?: number | null;
}

const CURVA_ITALCOL_MACHO: PuntoCurvaSeed[] = [
  // Dias 1 a 6 interpolados desde peso al nacer (42 g) hasta empatar con el
  // dia 7 del manual Italcol (211 g / 164 g acumulados).
  {
    sexo: 'macho',
    dia: 1,
    peso_esperado_g: 42,
    consumo_diario_g: 12,
    consumo_acumulado_g: 12,
    fcr_objetivo: 0.29,
    etapa_alimentacion: 'preiniciacion',
    temperatura_min: 31,
    temperatura_max: 33,
  },
  {
    sexo: 'macho',
    dia: 2,
    peso_esperado_g: 59,
    consumo_diario_g: 16,
    consumo_acumulado_g: 28,
    fcr_objetivo: 0.47,
    etapa_alimentacion: 'preiniciacion',
    temperatura_min: 31,
    temperatura_max: 33,
  },
  {
    sexo: 'macho',
    dia: 3,
    peso_esperado_g: 80,
    consumo_diario_g: 20,
    consumo_acumulado_g: 48,
    fcr_objetivo: 0.6,
    etapa_alimentacion: 'preiniciacion',
    temperatura_min: 30,
    temperatura_max: 32,
  },
  {
    sexo: 'macho',
    dia: 4,
    peso_esperado_g: 105,
    consumo_diario_g: 24,
    consumo_acumulado_g: 72,
    fcr_objetivo: 0.69,
    etapa_alimentacion: 'preiniciacion',
    temperatura_min: 30,
    temperatura_max: 32,
  },
  {
    sexo: 'macho',
    dia: 5,
    peso_esperado_g: 135,
    consumo_diario_g: 28,
    consumo_acumulado_g: 100,
    fcr_objetivo: 0.74,
    etapa_alimentacion: 'preiniciacion',
    temperatura_min: 29,
    temperatura_max: 31,
  },
  {
    sexo: 'macho',
    dia: 6,
    peso_esperado_g: 170,
    consumo_diario_g: 31,
    consumo_acumulado_g: 131,
    fcr_objetivo: 0.77,
    etapa_alimentacion: 'preiniciacion',
    temperatura_min: 29,
    temperatura_max: 31,
  },
  {
    sexo: 'macho',
    dia: 7,
    peso_esperado_g: 211,
    consumo_acumulado_g: 164,
    fcr_objetivo: 0.78,
    etapa_alimentacion: 'preiniciacion',
    temperatura_min: 28,
    temperatura_max: 30,
  },
  {
    sexo: 'macho',
    dia: 14,
    peso_esperado_g: 535,
    consumo_acumulado_g: 551,
    fcr_objetivo: 1.03,
    etapa_alimentacion: 'iniciacion',
    temperatura_min: 28,
    temperatura_max: 28,
  },
  {
    sexo: 'macho',
    dia: 21,
    peso_esperado_g: 1035,
    consumo_acumulado_g: 1218,
    fcr_objetivo: 1.18,
    etapa_alimentacion: 'iniciacion',
    temperatura_min: 26,
    temperatura_max: 26,
  },
  {
    sexo: 'macho',
    dia: 28,
    peso_esperado_g: 1681,
    consumo_acumulado_g: 2199,
    fcr_objetivo: 1.31,
    etapa_alimentacion: 'engorde',
    temperatura_min: null,
    temperatura_max: null,
  },
  {
    sexo: 'macho',
    dia: 35,
    peso_esperado_g: 2421,
    consumo_acumulado_g: 3483,
    fcr_objetivo: 1.44,
    etapa_alimentacion: 'engorde',
    temperatura_min: null,
    temperatura_max: null,
  },
  {
    sexo: 'macho',
    dia: 42,
    peso_esperado_g: 3100,
    consumo_acumulado_g: 5023,
    fcr_objetivo: 1.57,
    etapa_alimentacion: 'engorde',
    temperatura_min: null,
    temperatura_max: null,
  },
];

const CURVA_ITALCOL_HEMBRA: PuntoCurvaSeed[] = [
  {
    sexo: 'hembra',
    dia: 1,
    peso_esperado_g: 42,
    consumo_diario_g: 13,
    consumo_acumulado_g: 13,
    fcr_objetivo: 0.31,
    etapa_alimentacion: 'preiniciacion',
    temperatura_min: 31,
    temperatura_max: 33,
  },
  {
    sexo: 'hembra',
    dia: 2,
    peso_esperado_g: 59,
    consumo_diario_g: 18,
    consumo_acumulado_g: 31,
    fcr_objetivo: 0.53,
    etapa_alimentacion: 'preiniciacion',
    temperatura_min: 31,
    temperatura_max: 33,
  },
  {
    sexo: 'hembra',
    dia: 3,
    peso_esperado_g: 80,
    consumo_diario_g: 22,
    consumo_acumulado_g: 53,
    fcr_objetivo: 0.66,
    etapa_alimentacion: 'preiniciacion',
    temperatura_min: 30,
    temperatura_max: 32,
  },
  {
    sexo: 'hembra',
    dia: 4,
    peso_esperado_g: 105,
    consumo_diario_g: 26,
    consumo_acumulado_g: 79,
    fcr_objetivo: 0.75,
    etapa_alimentacion: 'preiniciacion',
    temperatura_min: 30,
    temperatura_max: 32,
  },
  {
    sexo: 'hembra',
    dia: 5,
    peso_esperado_g: 135,
    consumo_diario_g: 30,
    consumo_acumulado_g: 109,
    fcr_objetivo: 0.81,
    etapa_alimentacion: 'preiniciacion',
    temperatura_min: 29,
    temperatura_max: 31,
  },
  {
    sexo: 'hembra',
    dia: 6,
    peso_esperado_g: 170,
    consumo_diario_g: 33,
    consumo_acumulado_g: 142,
    fcr_objetivo: 0.84,
    etapa_alimentacion: 'preiniciacion',
    temperatura_min: 29,
    temperatura_max: 31,
  },
  {
    sexo: 'hembra',
    dia: 7,
    peso_esperado_g: 211,
    consumo_acumulado_g: 178,
    fcr_objetivo: 0.84,
    etapa_alimentacion: 'preiniciacion',
    temperatura_min: 28,
    temperatura_max: 30,
  },
  {
    sexo: 'hembra',
    dia: 14,
    peso_esperado_g: 523,
    consumo_acumulado_g: 555,
    fcr_objetivo: 1.06,
    etapa_alimentacion: 'iniciacion',
    temperatura_min: 28,
    temperatura_max: 28,
  },
  {
    sexo: 'hembra',
    dia: 21,
    peso_esperado_g: 980,
    consumo_acumulado_g: 1177,
    fcr_objetivo: 1.2,
    etapa_alimentacion: 'iniciacion',
    temperatura_min: 26,
    temperatura_max: 26,
  },
  {
    sexo: 'hembra',
    dia: 28,
    peso_esperado_g: 1548,
    consumo_acumulado_g: 2069,
    fcr_objetivo: 1.33,
    etapa_alimentacion: 'engorde',
    temperatura_min: null,
    temperatura_max: null,
  },
  {
    sexo: 'hembra',
    dia: 35,
    peso_esperado_g: 2176,
    consumo_acumulado_g: 3213,
    fcr_objetivo: 1.48,
    etapa_alimentacion: 'engorde',
    temperatura_min: null,
    temperatura_max: null,
  },
  {
    sexo: 'hembra',
    dia: 42,
    peso_esperado_g: 2700,
    consumo_acumulado_g: 4557,
    fcr_objetivo: 1.62,
    etapa_alimentacion: 'engorde',
    temperatura_min: null,
    temperatura_max: null,
  },
];

// Mixto de Italcol derivado como promedio de macho y hembra para cubrir lotes
// sin sexaje (el valor por defecto en Avisens es sexo = 'mixto').
const CURVA_ITALCOL_MIXTO: PuntoCurvaSeed[] = CURVA_ITALCOL_MACHO.map(
  (macho, indice) => {
    const hembra = CURVA_ITALCOL_HEMBRA[indice];
    const promedio = (a?: number, b?: number) =>
      a !== undefined && b !== undefined ? Math.round((a + b) / 2) : undefined;
    const promedioDecimal = (a?: number, b?: number) =>
      a !== undefined && b !== undefined
        ? Number(((a + b) / 2).toFixed(2))
        : undefined;

    return {
      sexo: 'mixto',
      dia: macho.dia,
      peso_esperado_g: Math.round(
        (macho.peso_esperado_g + hembra.peso_esperado_g) / 2,
      ),
      ...(macho.consumo_diario_g !== undefined &&
      hembra.consumo_diario_g !== undefined
        ? {
            consumo_diario_g: promedio(
              macho.consumo_diario_g,
              hembra.consumo_diario_g,
            ),
          }
        : {}),
      consumo_acumulado_g: promedio(
        macho.consumo_acumulado_g,
        hembra.consumo_acumulado_g,
      ),
      fcr_objetivo: promedioDecimal(macho.fcr_objetivo, hembra.fcr_objetivo),
      etapa_alimentacion: macho.etapa_alimentacion,
      temperatura_min: macho.temperatura_min,
      temperatura_max: macho.temperatura_max,
    };
  },
);

const CURVA_ITALCOL = [
  ...CURVA_ITALCOL_MACHO,
  ...CURVA_ITALCOL_HEMBRA,
  ...CURVA_ITALCOL_MIXTO,
].map((fila) => ({ ...fila, marca: 'italcol', fuente: 'italcol' }));

const CURVA_SOLLA = [
  // Dias 1 a 6 interpolados desde peso al nacer (42 g) hasta empatar con los
  // 160 g del dia 7 de Solla clima calido.
  {
    marca: 'solla',
    fuente: 'solla-clima-calido',
    sexo: 'mixto',
    dia: 1,
    peso_esperado_g: 42,
    etapa_alimentacion: 'preiniciacion',
  },
  {
    marca: 'solla',
    fuente: 'solla-clima-calido',
    sexo: 'mixto',
    dia: 2,
    peso_esperado_g: 55,
    etapa_alimentacion: 'preiniciacion',
  },
  {
    marca: 'solla',
    fuente: 'solla-clima-calido',
    sexo: 'mixto',
    dia: 3,
    peso_esperado_g: 71,
    etapa_alimentacion: 'preiniciacion',
  },
  {
    marca: 'solla',
    fuente: 'solla-clima-calido',
    sexo: 'mixto',
    dia: 4,
    peso_esperado_g: 89,
    etapa_alimentacion: 'preiniciacion',
  },
  {
    marca: 'solla',
    fuente: 'solla-clima-calido',
    sexo: 'mixto',
    dia: 5,
    peso_esperado_g: 110,
    etapa_alimentacion: 'preiniciacion',
  },
  {
    marca: 'solla',
    fuente: 'solla-clima-calido',
    sexo: 'mixto',
    dia: 6,
    peso_esperado_g: 133,
    etapa_alimentacion: 'preiniciacion',
  },
  {
    marca: 'solla',
    fuente: 'solla-clima-calido',
    sexo: 'mixto',
    dia: 7,
    peso_esperado_g: 160,
    etapa_alimentacion: 'preiniciacion',
  },
  {
    marca: 'solla',
    fuente: 'solla-clima-calido',
    sexo: 'mixto',
    dia: 14,
    peso_esperado_g: 370,
    etapa_alimentacion: 'iniciacion',
  },
  {
    marca: 'solla',
    fuente: 'solla-clima-calido',
    sexo: 'mixto',
    dia: 21,
    peso_esperado_g: 780,
    etapa_alimentacion: 'iniciacion',
  },
  {
    marca: 'solla',
    fuente: 'solla-clima-calido',
    sexo: 'mixto',
    dia: 28,
    peso_esperado_g: 1250,
    etapa_alimentacion: 'engorde',
  },
  {
    marca: 'solla',
    fuente: 'solla-clima-calido',
    sexo: 'mixto',
    dia: 35,
    peso_esperado_g: 1750,
    etapa_alimentacion: 'engorde',
  },
  {
    marca: 'solla',
    fuente: 'solla-clima-calido',
    sexo: 'mixto',
    dia: 42,
    peso_esperado_g: 2250,
    fcr_objetivo: 1.85,
    etapa_alimentacion: 'engorde',
  },
];

const CURVAS_OBJETIVO = [...CURVA_ITALCOL, ...CURVA_SOLLA];

export async function sembrarCurvasObjetivo(prisma: PrismaClient) {
  for (const fila of CURVAS_OBJETIVO) {
    // `origen: seed` marca las que vienen del manual del fabricante. Son las
    // unicas que el seed puede pisar, y las unicas que la API no deja editar:
    // cambiarles un peso objetivo falsea la referencia contra la que se
    // comparan los indicadores durante todo el ciclo.
    const datos = { ...fila, origen: 'seed' };
    await prisma.curvaObjetivo.upsert({
      where: {
        marca_sexo_dia: { marca: fila.marca, sexo: fila.sexo, dia: fila.dia },
      },
      update: datos,
      create: datos,
    });
  }
}
