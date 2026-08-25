import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';

@Injectable()
export class OrganizacionesService {
  constructor(private prisma: PrismaService) {}

  async listar({ page, limit }: PaginationQueryDto) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.organizacion.findMany({
        select: {
          id: true,
          nombre: true,
          nit: true,
          plan: true,
          activa: true,
          fecha_creacion: true,
        },
        orderBy: { nombre: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.organizacion.count(),
    ]);

    return paginate(data, total, page, limit);
  }
}
