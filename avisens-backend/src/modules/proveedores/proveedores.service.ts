import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';

// El proveedor es una entidad global (no pertenece a un propietario), así que
// aquí NO hay alcance por rol: es un CRUD directo. El control de quién puede
// escribir vs. leer se aplica en el controller con @Roles por método.
@Injectable()
export class ProveedoresService {
  constructor(private prisma: PrismaService) {}

  crear(dto: CreateProveedorDto) {
    // nit es único: si se repite, el PrismaExceptionFilter devuelve 409.
    return this.prisma.proveedor.create({
      data: {
        nombre: dto.nombre,
        nit: dto.nit,
        tipo_proveedor: dto.tipo_proveedor,
        contacto_persona: dto.contacto_persona,
        telefono: dto.telefono,
        email: dto.email,
        direccion: dto.direccion,
      },
    });
  }

  async listar({ page, limit }: PaginationQueryDto) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.proveedor.findMany({
        orderBy: { id: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.proveedor.count(),
    ]);
    return paginate(data, total, page, limit);
  }

  async obtener(id: number) {
    const proveedor = await this.prisma.proveedor.findUnique({ where: { id } });
    if (!proveedor) throw new NotFoundException('Proveedor no encontrado');
    return proveedor;
  }

  async actualizar(id: number, dto: UpdateProveedorDto) {
    await this.obtener(id); // valida existencia
    return this.prisma.proveedor.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        nit: dto.nit,
        tipo_proveedor: dto.tipo_proveedor,
        contacto_persona: dto.contacto_persona,
        telefono: dto.telefono,
        email: dto.email,
        direccion: dto.direccion,
        activo: dto.activo,
      },
    });
  }

  async desactivar(id: number) {
    await this.obtener(id);
    // Borrado suave: conserva el histórico (compras, movimientos) que lo referencie.
    await this.prisma.proveedor.update({
      where: { id },
      data: { activo: false },
    });
    return { id, activo: false };
  }

  async activar(id: number) {
    await this.obtener(id);
    await this.prisma.proveedor.update({
      where: { id },
      data: { activo: true },
    });
    return { id, activo: true };
  }

  async eliminarPermanente(id: number) {
    await this.obtener(id);
    // Si tiene compras/movimientos asociados, la FK ON DELETE RESTRICT lo impedirá.
    await this.prisma.proveedor.delete({ where: { id } });
    return { id, eliminado: true };
  }
}
