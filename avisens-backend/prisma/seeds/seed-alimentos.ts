import type { PrismaClient } from '@prisma/client';

/**
 * El plan de alimentación de Italcol, tal como viene en su manual de pollo de
 * engorde (paso 24, «Plan de alimentación sugerido por Italcol»).
 *
 * Italcol no cambia de alimento por día sino por gramos consumidos: 200 g de
 * preiniciador, 1.000 g de iniciación y de ahí en adelante engorde. Los días
 * salen de cruzar esas cantidades con la tabla de consumo acumulado del mismo
 * manual: los 200 g se pasan el día 8 (204 g) y los 1.200 g acumulados el día
 * 21 (1.218 g). Por eso los rangos son 1-8, 9-21 y 22 en adelante.
 *
 * Solla no está: no tenemos su manual, y unos gramos inventados en un catálogo
 * que después alimenta los indicadores hacen más daño que una fila de menos.
 * El administrador puede crearlos desde la pantalla de catálogos.
 */
const TIPOS_ALIMENTO = [
  {
    nombre: 'Pollito Preiniciador',
    marca: 'italcol',
    etapa: 'preiniciacion',
    presentacion: 'quebrantado',
    dia_inicio: 1,
    dia_fin: 8,
    consumo_total_esperado_g: 200,
  },
  {
    nombre: 'Súper Pollito Iniciación',
    marca: 'italcol',
    etapa: 'iniciacion',
    presentacion: 'quebrantado',
    dia_inicio: 9,
    dia_fin: 21,
    consumo_total_esperado_g: 1000,
  },
  {
    nombre: 'Súper Pollo Engorde Granja',
    marca: 'italcol',
    etapa: 'engorde',
    presentacion: 'quebrantado',
    dia_inicio: 22,
    dia_fin: 42,
    consumo_total_esperado_g: 2800,
  },
];

export async function sembrarTiposAlimento(prisma: PrismaClient) {
  for (const tipo of TIPOS_ALIMENTO) {
    const existente = await prisma.tipoAlimento.findFirst({
      where: { nombre: tipo.nombre, marca: tipo.marca },
    });
    if (!existente) {
      await prisma.tipoAlimento.create({ data: tipo });
    }
  }
}
