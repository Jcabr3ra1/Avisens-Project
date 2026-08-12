import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCurvaObjetivoDto } from './dto/create-curva-objetivo.dto';
import { UpdateCurvaObjetivoDto } from './dto/update-curva-objetivo.dto';
import { QueryCurvasObjetivoDto } from './dto/query-curvas-objetivo.dto';
import { paginate } from '../../common/pagination/paginate';

@Injectable()
export class CurvasObjetivoService {
  constructor(private prisma: PrismaService) {}

  async crear(dto: CreateCurvaObjetivoDto) {
    await this.verificarUnica(dto.sexo, dto.dia);
    return this.prisma.curvaObjetivo.create({
      data: {
        sexo: dto.sexo,
        dia: dto.dia,
        peso_esperado_g: dto.peso_esperado_g,
        consumo_diario_g: dto.consumo_diario_g,
        consumo_acumulado_g: dto.consumo_acumulado_g,
        fcr_objetivo: dto.fcr_objetivo,
        etapa_alimentacion: dto.etapa_alimentacion,
        temperatura_min: dto.temperatura_min,
        temperatura_max: dto.temperatura_max,
      },
    });
  }

  async listar({ sexo, page, limit }: QueryCurvasObjetivoDto) {
    const where = sexo ? { sexo } : undefined;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.curvaObjetivo.findMany({
        where,
        orderBy: [{ sexo: 'asc' }, { dia: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.curvaObjetivo.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  async obtener(id: number) {
    const curva = await this.prisma.curvaObjetivo.findUnique({ where: { id } });
    if (!curva) throw new NotFoundException('Punto de curva no encontrado');
    return curva;
  }

  async actualizar(id: number, dto: UpdateCurvaObjetivoDto) {
    const actual = await this.obtener(id);
    const sexo = dto.sexo ?? actual.sexo;
    const dia = dto.dia ?? actual.dia;
    if (sexo !== actual.sexo || dia !== actual.dia) {
      await this.verificarUnica(sexo, dia, id);
    }
    return this.prisma.curvaObjetivo.update({
      where: { id },
      data: {
        sexo: dto.sexo,
        dia: dto.dia,
        peso_esperado_g: dto.peso_esperado_g,
        consumo_diario_g: dto.consumo_diario_g,
        consumo_acumulado_g: dto.consumo_acumulado_g,
        fcr_objetivo: dto.fcr_objetivo,
        etapa_alimentacion: dto.etapa_alimentacion,
        temperatura_min: dto.temperatura_min,
        temperatura_max: dto.temperatura_max,
      },
    });
  }

  async eliminar(id: number) {
    await this.obtener(id);
    await this.prisma.curvaObjetivo.delete({ where: { id } });
    return { id, eliminado: true };
  }

  private async verificarUnica(sexo: string, dia: number, exceptoId?: number) {
    const existente = await this.prisma.curvaObjetivo.findUnique({
      where: { sexo_dia: { sexo, dia } },
    });
    if (existente && existente.id !== exceptoId) {
      throw new ConflictException(
        `Ya existe un punto de curva para sexo ${sexo} y dia ${dia}`,
      );
    }
  }
}
