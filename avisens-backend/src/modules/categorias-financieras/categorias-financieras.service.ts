import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/pagination/paginate';
import { ListarCategoriasFinancierasDto } from './dto/listar-categorias-financieras.dto';

const SELECT = {
  id: true,
  nombre: true,
  tipo: true,
  descripcion: true,
  activo: true,
} as const;

@Injectable()
export class CategoriasFinancierasService {
  constructor(private prisma: PrismaService) {}

  /**
   * El catálogo con el que se clasifica un movimiento financiero.
   *
   * No lleva alcance por rol: la categoría no cuelga de una granja, es la misma
   * para toda la instalación. Lo que sí cuelga de la granja es el movimiento, y
   * ese ya filtra por su lado.
   */
  async listar({
    page,
    limit,
    tipo,
    solo_activas,
  }: ListarCategoriasFinancierasDto) {
    const where: Prisma.CategoriaFinancieraWhereInput = {
      ...(tipo !== undefined ? { tipo } : {}),
      // Por defecto sólo las activas: una categoría desactivada no debería
      // aparecer en el desplegable de un formulario nuevo.
      ...(solo_activas === false ? {} : { activo: true }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.categoriaFinanciera.findMany({
        where,
        select: SELECT,
        // Por nombre y no por id: es una lista para escoger a ojo, no un
        // histórico donde lo último importe más.
        orderBy: { nombre: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.categoriaFinanciera.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async obtener(id: number) {
    const categoria = await this.prisma.categoriaFinanciera.findUnique({
      where: { id },
      select: SELECT,
    });
    if (!categoria) {
      throw new NotFoundException('Categoría financiera no encontrada');
    }
    return categoria;
  }
}
