import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';
import { CreateLineaGeneticaDto } from './dto/create-linea-genetica.dto';
import { UpdateLineaGeneticaDto } from './dto/update-linea-genetica.dto';

@Injectable()
export class LineasGeneticasService {
  constructor(private prisma: PrismaService) {}

  private esConflictoUnico(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }

  async crear(dto: CreateLineaGeneticaDto) {
    const codigo = dto.codigo.trim().toLowerCase();
    try {
      return await this.prisma.lineaGenetica.create({
        data: { codigo, nombre: dto.nombre, descripcion: dto.descripcion },
      });
    } catch (error: unknown) {
      if (this.esConflictoUnico(error)) {
        throw new ConflictException(
          `Ya existe una línea genética con el código "${codigo}"`,
        );
      }
      throw error;
    }
  }

  async listar({ page, limit }: PaginationQueryDto) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.lineaGenetica.findMany({
        orderBy: { codigo: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.lineaGenetica.count(),
    ]);
    return paginate(data, total, page, limit);
  }

  async obtener(id: number) {
    const linea = await this.prisma.lineaGenetica.findUnique({
      where: { id },
    });
    if (!linea) throw new NotFoundException('Línea genética no encontrada');
    return linea;
  }

  async actualizar(id: number, dto: UpdateLineaGeneticaDto) {
    await this.obtener(id);
    return this.prisma.lineaGenetica.update({ where: { id }, data: dto });
  }

  async cambiarEstado(id: number, activo: boolean) {
    await this.obtener(id);
    await this.prisma.lineaGenetica.update({ where: { id }, data: { activo } });
    return { id, activo };
  }
}
