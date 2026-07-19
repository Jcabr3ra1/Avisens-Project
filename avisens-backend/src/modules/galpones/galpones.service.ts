import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGalponDto } from './dto/create-galpon.dto';
import { UpdateGalponDto } from './dto/update-galpon.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';

const ROL_PROPIETARIO = 'Propietario';

// Quién hace la petición. Su rol decide el alcance:
// - Administrador: gestiona todos los galpones.
// - Propietario: solo los galpones de granjas de las que es dueño.
type Solicitante = { id: number; rol: string };

const GALPON_SELECT = {
  id: true,
  codigo: true,
  nombre: true,
  capacidad_aves: true,
  ancho_metros: true,
  largo_metros: true,
  orientacion: true,
  tipo_techo: true,
  plano_url: true,
  activo: true,
  fecha_construccion: true,
  granja: { select: { id: true, nombre: true, propietario_id: true } },
} as const;

@Injectable()
export class GalponesService {
  constructor(private prisma: PrismaService) {}

  private esPropietario(solicitante: Solicitante): boolean {
    return solicitante.rol === ROL_PROPIETARIO;
  }

  // Verifica que la granja exista y, si el solicitante es Propietario, que sea
  // suya. Se usa al crear o al mover un galpón entre granjas.
  private async validarGranja(granjaId: number, solicitante: Solicitante) {
    const granja = await this.prisma.granja.findUnique({ where: { id: granjaId } });
    if (!granja) throw new NotFoundException('Granja no encontrada');
    if (this.esPropietario(solicitante) && granja.propietario_id !== solicitante.id) {
      throw new ForbiddenException('Solo puedes gestionar galpones de tus propias granjas');
    }
  }

  async crear(dto: CreateGalponDto, solicitante: Solicitante) {
    await this.validarGranja(dto.granja_id, solicitante);

    // El par (granja_id, codigo) es único: si se repite, la restricción de
    // Prisma + el PrismaExceptionFilter devuelven 409 automáticamente.
    return this.prisma.galpon.create({
      data: {
        granja_id: dto.granja_id,
        codigo: dto.codigo,
        nombre: dto.nombre,
        capacidad_aves: dto.capacidad_aves,
        ancho_metros: dto.ancho_metros,
        largo_metros: dto.largo_metros,
        orientacion: dto.orientacion,
        tipo_techo: dto.tipo_techo,
        plano_url: dto.plano_url,
        fecha_construccion: dto.fecha_construccion
          ? new Date(dto.fecha_construccion)
          : undefined,
      },
      select: GALPON_SELECT,
    });
  }

  async listar(solicitante: Solicitante, { page, limit }: PaginationQueryDto) {
    // El Propietario solo ve galpones de sus granjas; el Admin ve todos.
    const where = this.esPropietario(solicitante)
      ? { granja: { propietario_id: solicitante.id } }
      : undefined;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.galpon.findMany({
        where,
        select: GALPON_SELECT,
        orderBy: { id: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.galpon.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async obtener(id: number, solicitante: Solicitante) {
    const galpon = await this.prisma.galpon.findUnique({
      where: { id },
      select: GALPON_SELECT,
    });
    if (!galpon) throw new NotFoundException('Galpón no encontrado');
    if (
      this.esPropietario(solicitante) &&
      galpon.granja.propietario_id !== solicitante.id
    ) {
      throw new ForbiddenException('Solo puedes gestionar galpones de tus propias granjas');
    }
    return galpon;
  }

  async actualizar(id: number, dto: UpdateGalponDto, solicitante: Solicitante) {
    await this.obtener(id, solicitante); // valida existencia y alcance actual

    // Si se mueve a otra granja, validar que exista y que el solicitante pueda usarla.
    if (dto.granja_id) {
      await this.validarGranja(dto.granja_id, solicitante);
    }

    return this.prisma.galpon.update({
      where: { id },
      data: {
        granja_id: dto.granja_id,
        codigo: dto.codigo,
        nombre: dto.nombre,
        capacidad_aves: dto.capacidad_aves,
        ancho_metros: dto.ancho_metros,
        largo_metros: dto.largo_metros,
        orientacion: dto.orientacion,
        tipo_techo: dto.tipo_techo,
        plano_url: dto.plano_url,
        activo: dto.activo,
        fecha_construccion: dto.fecha_construccion
          ? new Date(dto.fecha_construccion)
          : undefined,
      },
      select: GALPON_SELECT,
    });
  }

  async desactivar(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante); // valida existencia y alcance

    // Borrado suave: el galpón queda inactivo pero conserva su historial.
    await this.prisma.galpon.update({ where: { id }, data: { activo: false } });
    return { id, activo: false };
  }

  async eliminarPermanente(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante); // valida existencia y alcance

    // Borrado permanente (casos legales). Si el galpón tiene dispositivos o
    // sensores asociados, la FK ON DELETE RESTRICT lo impedirá (400 vía filtro).
    await this.prisma.galpon.delete({ where: { id } });
    return { id, eliminado: true };
  }
}
