import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEventoSanitarioDto } from './dto/create-evento-sanitario.dto';
import { UpdateEventoSanitarioDto } from './dto/update-evento-sanitario.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';
import {
  esPropietario,
  verificarDueno,
  Solicitante,
} from '../../common/auth/acceso';

const SANITARIO_SELECT = {
  id: true,
  lote_id: true,
  insumo_id: true,
  tipo: true,
  diagnostico: true,
  producto: true,
  dosis: true,
  via_aplicacion: true,
  cantidad_aves: true,
  fecha: true,
  usuario_id: true,
  metodo_registro: true,
  observaciones: true,
  fecha_registro: true,
  lote: {
    select: {
      id: true,
      codigo: true,
      galpon: { select: { granja: { select: { propietario_id: true } } } },
    },
  },
  insumo: { select: { id: true, nombre: true } },
} as const;

@Injectable()
export class EventosSanitariosService {
  constructor(private prisma: PrismaService) {}

  private async validarLote(loteId: number, solicitante: Solicitante) {
    const lote = await this.prisma.lote.findUnique({
      where: { id: loteId },
      select: {
        id: true,
        galpon: { select: { granja: { select: { propietario_id: true } } } },
      },
    });

    if (!lote) throw new NotFoundException('Lote no encontrado');
    verificarDueno(
      solicitante,
      lote.galpon.granja.propietario_id,
      'Solo puedes registrar eventos sanitarios de tus propios lotes',
    );
  }

  private async validarInsumo(insumoId: number) {
    const insumo = await this.prisma.inventarioInsumo.findUnique({
      where: { id: insumoId },
      select: { id: true },
    });

    if (!insumo) throw new NotFoundException('Insumo no encontrado');
  }

  async crear(dto: CreateEventoSanitarioDto, solicitante: Solicitante) {
    await this.validarLote(dto.lote_id, solicitante);
    if (dto.insumo_id) {
      await this.validarInsumo(dto.insumo_id);
    }

    return this.prisma.eventoSanitario.create({
      data: {
        lote_id: dto.lote_id,
        insumo_id: dto.insumo_id,
        usuario_id: solicitante.id,
        tipo: dto.tipo,
        diagnostico: dto.diagnostico,
        producto: dto.producto,
        dosis: dto.dosis,
        via_aplicacion: dto.via_aplicacion,
        cantidad_aves: dto.cantidad_aves,
        fecha: new Date(dto.fecha),
        metodo_registro: dto.metodo_registro,
        observaciones: dto.observaciones,
      },
      select: SANITARIO_SELECT,
    });
  }

  async listar(solicitante: Solicitante, { page, limit }: PaginationQueryDto) {
    const where = esPropietario(solicitante)
      ? { lote: { galpon: { granja: { propietario_id: solicitante.id } } } }
      : undefined;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.eventoSanitario.findMany({
        where,
        select: SANITARIO_SELECT,
        orderBy: { fecha: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.eventoSanitario.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async obtener(id: number, solicitante: Solicitante) {
    const evento = await this.prisma.eventoSanitario.findUnique({
      where: { id },
      select: SANITARIO_SELECT,
    });

    if (!evento) throw new NotFoundException('Evento sanitario no encontrado');
    verificarDueno(
      solicitante,
      evento.lote.galpon.granja.propietario_id,
      'Solo puedes ver eventos sanitarios de tus propios lotes',
    );
    return evento;
  }

  async actualizar(
    id: number,
    dto: UpdateEventoSanitarioDto,
    solicitante: Solicitante,
  ) {
    await this.obtener(id, solicitante);

    if (dto.lote_id) {
      await this.validarLote(dto.lote_id, solicitante);
    }
    if (dto.insumo_id) {
      await this.validarInsumo(dto.insumo_id);
    }

    return this.prisma.eventoSanitario.update({
      where: { id },
      data: {
        lote_id: dto.lote_id,
        insumo_id: dto.insumo_id,
        tipo: dto.tipo,
        diagnostico: dto.diagnostico,
        producto: dto.producto,
        dosis: dto.dosis,
        via_aplicacion: dto.via_aplicacion,
        cantidad_aves: dto.cantidad_aves,
        fecha: dto.fecha ? new Date(dto.fecha) : undefined,
        metodo_registro: dto.metodo_registro,
        observaciones: dto.observaciones,
      },
      select: SANITARIO_SELECT,
    });
  }

  async eliminar(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante);

    await this.prisma.eventoSanitario.delete({ where: { id } });
    return { id, eliminado: true };
  }
}
