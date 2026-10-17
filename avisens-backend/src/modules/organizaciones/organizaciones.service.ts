import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';
import { CreateOrganizacionDto } from './dto/create-organizacion.dto';
import { UpdateOrganizacionDto } from './dto/update-organizacion.dto';
import {
  revocarAsignacionesDeLaOrganizacion,
  revocarSesionesDeLaOrganizacion,
} from '../../common/bloqueos/revocar-acceso';
import {
  esEsperaVencida,
  TOPE_ESPERA_ESCRITURA_MS,
  transaccionConPresupuesto,
} from '../../common/bloqueos/presupuesto-transaccion';
import { MENSAJE_ORGANIZACION_OCUPADA } from '../../common/errores/bloqueo';

const ORGANIZACION_SELECT = {
  id: true,
  nombre: true,
  nit: true,
  plan: true,
  activa: true,
  fecha_creacion: true,
  _count: { select: { usuarios: true, granjas: true } },
} as const;

@Injectable()
export class OrganizacionesService {
  constructor(private prisma: PrismaService) {}

  crear(dto: CreateOrganizacionDto) {
    return this.prisma.organizacion.create({
      data: {
        nombre: dto.nombre.trim(),
        nit: dto.nit?.trim(),
        plan: dto.plan,
      },
      select: ORGANIZACION_SELECT,
    });
  }

  async listar({ page, limit }: PaginationQueryDto) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.organizacion.findMany({
        select: ORGANIZACION_SELECT,
        orderBy: { nombre: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.organizacion.count(),
    ]);

    return paginate(data, total, page, limit);
  }

  async obtener(id: number) {
    const organizacion = await this.prisma.organizacion.findUnique({
      where: { id },
      select: ORGANIZACION_SELECT,
    });
    if (!organizacion) {
      throw new NotFoundException('Organización no encontrada');
    }
    return organizacion;
  }

  async actualizar(id: number, dto: UpdateOrganizacionDto) {
    await this.obtener(id);
    return this.prisma.organizacion.update({
      where: { id },
      data: {
        nombre: dto.nombre?.trim(),
        nit: dto.nit?.trim(),
        plan: dto.plan,
      },
      select: ORGANIZACION_SELECT,
    });
  }

  async desactivar(id: number) {
    await this.obtener(id);

    try {
      await transaccionConPresupuesto(
        this.prisma,
        TOPE_ESPERA_ESCRITURA_MS,
        async (p) => {
          const usuarios = await p.paso(
            'bloquear usuarios de la organización',
            (tx) =>
              tx.$queryRaw<
                Array<{ id: number }>
              >`SELECT "id" FROM "usuarios" WHERE "organizacion_id" = ${id} ORDER BY "id" FOR NO KEY UPDATE`,
          );
          await p.paso('desactivar usuarios', (tx) =>
            tx.usuario.updateMany({
              where: { id: { in: usuarios.map((u) => u.id) }, activo: true },
              data: { activo: false },
            }),
          );
          await revocarSesionesDeLaOrganizacion(p, id);
          await revocarAsignacionesDeLaOrganizacion(p, id);
          await p.paso('desactivar granjas', (tx) =>
            tx.granja.updateMany({
              where: { organizacion_id: id, activa: true },
              data: { activa: false },
            }),
          );
          await p.paso('desactivar organización', (tx) =>
            tx.organizacion.update({
              where: { id },
              data: { activa: false },
            }),
          );
        },
      );
    } catch (error) {
      if (esEsperaVencida(error)) {
        throw new ConflictException(MENSAJE_ORGANIZACION_OCUPADA);
      }
      throw error;
    }
    return { id, activa: false };
  }

  async activar(id: number) {
    await this.obtener(id);
    await this.prisma.organizacion.update({
      where: { id },
      data: { activa: true },
    });
    return { id, activa: true };
  }
}
