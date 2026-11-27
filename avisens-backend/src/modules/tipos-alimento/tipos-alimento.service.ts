import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTipoAlimentoDto } from './dto/create-tipo-alimento.dto';
import { UpdateTipoAlimentoDto } from './dto/update-tipo-alimento.dto';
import { ListarTiposAlimentoDto } from './dto/listar-tipos-alimento.dto';
import { paginate } from '../../common/pagination/paginate';

@Injectable()
export class TiposAlimentoService {
  constructor(private prisma: PrismaService) {}

  async crear(dto: CreateTipoAlimentoDto) {
    return this.prisma.tipoAlimento.create({
      data: {
        nombre: dto.nombre,
        marca: dto.marca,
        etapa: dto.etapa,
        presentacion: dto.presentacion,
        dia_inicio: dto.dia_inicio,
        dia_fin: dto.dia_fin,
        consumo_total_esperado_g: dto.consumo_total_esperado_g,
      },
    });
  }

  /**
   * El catálogo de alimentos, que sirve a dos pantallas distintas.
   *
   * El formulario de consumo diario necesita sólo los activos: un alimento
   * retirado no debe poder escogerse en un registro nuevo. La pantalla de
   * catálogos del administrador necesita verlos todos, para reactivar uno.
   * Por eso el filtro es opcional y por defecto deja fuera los inactivos.
   *
   * El orden es por día de vida, que es como se usan: el preiniciador primero
   * y el engorde al final. Por id descendente salía primero el último que
   * alguien creó, que no le dice nada a quien está registrando el consumo.
   */
  async listar({ page, limit, marca, solo_activos }: ListarTiposAlimentoDto) {
    const where: Prisma.TipoAlimentoWhereInput = {
      ...(marca !== undefined ? { marca } : {}),
      ...(solo_activos === false ? {} : { activo: true }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.tipoAlimento.findMany({
        where,
        orderBy: [{ dia_inicio: 'asc' }, { nombre: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.tipoAlimento.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  async obtener(id: number) {
    const tipo = await this.prisma.tipoAlimento.findUnique({ where: { id } });
    if (!tipo) throw new NotFoundException('Tipo de alimento no encontrado');
    return tipo;
  }

  async actualizar(id: number, dto: UpdateTipoAlimentoDto) {
    await this.obtener(id);
    return this.prisma.tipoAlimento.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        marca: dto.marca,
        etapa: dto.etapa,
        presentacion: dto.presentacion,
        dia_inicio: dto.dia_inicio,
        dia_fin: dto.dia_fin,
        consumo_total_esperado_g: dto.consumo_total_esperado_g,
        activo: dto.activo,
      },
    });
  }

  async desactivar(id: number) {
    await this.obtener(id);
    await this.prisma.tipoAlimento.update({
      where: { id },
      data: { activo: false },
    });
    return { id, activo: false };
  }

  async activar(id: number) {
    await this.obtener(id);
    await this.prisma.tipoAlimento.update({
      where: { id },
      data: { activo: true },
    });
    return { id, activo: true };
  }

  async eliminarPermanente(id: number) {
    await this.obtener(id);
    await this.prisma.tipoAlimento.delete({ where: { id } });
    return { id, eliminado: true };
  }
}
