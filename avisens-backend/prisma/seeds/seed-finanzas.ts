import type { PrismaClient } from '@prisma/client';

const CATEGORIAS_FINANCIERAS = [
  { nombre: 'Venta de aves', tipo: 'ingreso' },
  { nombre: 'Compra de pollitos', tipo: 'egreso' },
  { nombre: 'Compra de alimento', tipo: 'egreso' },
  { nombre: 'Sanidad y vacunas', tipo: 'egreso' },
  { nombre: 'Servicios e insumos', tipo: 'egreso' },
];

export async function sembrarCategoriasFinancieras(prisma: PrismaClient) {
  for (const categoria of CATEGORIAS_FINANCIERAS) {
    const existente = await prisma.categoriaFinanciera.findFirst({
      where: { nombre: categoria.nombre },
    });
    if (!existente) {
      await prisma.categoriaFinanciera.create({ data: categoria });
    }
  }
}
